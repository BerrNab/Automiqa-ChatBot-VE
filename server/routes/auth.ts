import { Router } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { requireAuth, requireAdminAuth, requireClientAuth } from "../middleware/auth";
import { authService } from "../application/authService";
import config from "../config";

const router = Router();

/**
 * Configure session and passport middleware
 */
export function configureAuth(app: any) {
  // Validate SESSION_SECRET - NEVER use default fallback for security
  if (!config.sessionSecret || config.sessionSecret === "your-secret-key") {
    throw new Error("SESSION_SECRET environment variable must be set with a strong, unique value");
  }

  // Session configuration with security hardening
  app.use(session({
    secret: config.sessionSecret!,
    resave: false,
    saveUninitialized: false,
    name: 'sessionId', // Don't use default 'connect.sid' name
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict', // CSRF protection
    },
  }));

  // Passport configuration
  app.use(passport.initialize());
  app.use(passport.session());

  // Admin authentication strategy
  passport.use('admin-local', new LocalStrategy(
    async (username: string, password: string, done) => {
      try {
        const result = await authService.authenticateAdmin(username, password);
        if (!result.success) {
          return done(null, false, { message: result.message });
        }
        return done(null, result.user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Client authentication strategy
  passport.use('client-local', new LocalStrategy({
    usernameField: 'authEmail',
    passwordField: 'password'
  }, async (authEmail: string, password: string, done) => {
    try {
      const result = await authService.authenticateClient(authEmail, password);
      if (!result.success) {
        return done(null, false, { message: result.message });
      }
      return done(null, result.user);
    } catch (error) {
      return done(error);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, { id: user.id, role: user.role });
  });

  passport.deserializeUser(async (userData: any, done) => {
    try {
      const user = await authService.getUserById(userData.id, userData.role);
      if (user) {
        done(null, user);
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error);
    }
  });
}

// Admin Authentication Routes
router.post("/admin/login", (req, res, next) => {
  passport.authenticate("admin-local", (err: any, user: any, info: any) => {
    if (err) {
      return res.status(500).json({ message: "Authentication error" });
    }
    if (!user) {
      return res.status(401).json({ message: info?.message || "Authentication failed" });
    }
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Login error" });
      }
      return res.json({ 
        user: authService.getAdminUserData(user)
      });
    });
  })(req, res, next);
});

router.post("/admin/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout error" });
    }
    
    // Destroy the session completely
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error("Session destroy error:", destroyErr);
      }
      
      // Clear the session cookie explicitly
      res.clearCookie('sessionId', {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: 'strict'
      });
      
      res.json({ message: "Logged out successfully" });
    });
  });
});

router.get("/admin/me", requireAdminAuth, (req, res) => {
  const user = req.user as any;
  res.json({ 
    user: authService.getAdminUserData(user)
  });
});

// Client Authentication Routes
router.post("/client/login", (req, res, next) => {
  passport.authenticate("client-local", (err: any, user: any, info: any) => {
    if (err) {
      return res.status(500).json({ message: "Authentication error" });
    }
    if (!user) {
      return res.status(401).json({ message: info?.message || "Authentication failed" });
    }
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Login error" });
      }
      return res.json({ 
        user: authService.getClientUserData(user)
      });
    });
  })(req, res, next);
});

router.post("/client/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout error" });
    }
    
    // Destroy the session completely
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error("Session destroy error:", destroyErr);
      }
      
      // Clear the session cookie explicitly
      res.clearCookie('sessionId', {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: 'strict'
      });
      
      res.json({ message: "Logged out successfully" });
    });
  });
});

router.get("/client/me", requireClientAuth, (req, res) => {
  const user = req.user as any;
  res.json({ 
    user: authService.getClientUserData(user)
  });
});

export { router as authRoutes };