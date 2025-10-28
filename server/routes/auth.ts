import { Router } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { requireAuth, requireAdminAuth, requireClientAuth } from "../middleware/auth";
import { authService } from "../application/authService";
import config from "../config";
import pg from "pg";

const router = Router();
const PgSession = connectPgSimple(session);

/**
 * Configure session and passport middleware
 */
export function configureAuth(app: any) {
  // Validate SESSION_SECRET - NEVER use default fallback for security
  if (!config.sessionSecret || config.sessionSecret === "your-secret-key") {
    throw new Error("SESSION_SECRET environment variable must be set with a strong, unique value");
  }

  // TODO: Enable PostgreSQL session store once DATABASE_URL is fixed
  // For now, using memory store with improved cookie settings
  console.log('⚠️  Using memory session store (sessions will be lost on server restart)');
  console.log('💡 To enable persistent sessions, set a valid DATABASE_URL in .env');
  
  let pgPool: pg.Pool | undefined = undefined;
  
  // Uncomment below to enable PostgreSQL session store:
  /*
  const connectionString = config.databaseUrl || process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.warn("⚠️  No DATABASE_URL found. Session store will use memory");
  } else {
    try {
      pgPool = new pg.Pool({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });
      
      pgPool.on('error', (err) => {
        console.error('⚠️  PostgreSQL pool error:', err.message);
      });
      
      console.log('✅ PostgreSQL session store configured');
    } catch (error: any) {
      console.error('⚠️  Failed to create PostgreSQL pool:', error.message);
      pgPool = undefined;
    }
  }
  */

  // Session configuration with PostgreSQL store (if available)
  const sessionConfig: any = {
    secret: config.sessionSecret!,
    resave: false,
    saveUninitialized: false,
    name: 'sessionId', // Don't use default 'connect.sid' name
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (increased from 24 hours)
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility with refreshes
    },
    rolling: true, // Reset maxAge on every response to keep active sessions alive
  };

  // Add PostgreSQL store if connection is available
  if (pgPool) {
    try {
      sessionConfig.store = new PgSession({
        pool: pgPool,
        tableName: 'session', // Will be created automatically
        createTableIfMissing: true,
        pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
      });
    } catch (error: any) {
      console.error('⚠️  Failed to initialize PgSession store:', error.message);
      console.warn('⚠️  Falling back to memory session store');
    }
  }

  app.use(session(sessionConfig));

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