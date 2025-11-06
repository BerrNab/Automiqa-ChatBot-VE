import { Router } from "express";
import { requireAdminAuth, requireClientAuth } from "../middleware/supabase-auth.js";
import { createClient } from "@supabase/supabase-js";
import config from "../config.js";

const router = Router();

// Supabase client for authentication
const supabase = createClient(
  config.supabaseUrl!,
  config.supabaseAnonKey!
);

/**
 * Admin login - creates admin user in Supabase Auth
 */
router.post("/admin/login", async (req, res) => {
  try {
    // Accept both 'email' and 'username' fields for backward compatibility
    const { email, username, password } = req.body;
    const loginEmail = email || username;

    if (!loginEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user has admin role
    const role = data.user.user_metadata?.role || data.user.app_metadata?.role;
    
    if (role !== 'admin') {
      await supabase.auth.signOut();
      return res.status(403).json({ message: "Admin access required" });
    }

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: role,
        ...data.user.user_metadata,
      },
      session: data.session,
      access_token: data.session.access_token,
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: "Login failed" });
  }
});

/**
 * Client login
 */
router.post("/client/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Check if client exists in our database
    const client = await storage.getClientByEmail(email);
    
    if (!client) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // If user doesn't exist, create them
      if (error.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: 'client',
              client_id: client.id,
              company_name: client.companyName,
            }
          }
        });

        if (signUpError) {
          console.error('Client signup error:', signUpError);
          return res.status(500).json({ message: "Failed to create client session" });
        }

        // Sign in
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        return res.json({
          user: {
            id: client.id,
            email: client.authEmail,
            companyName: client.companyName,
            role: 'client',
          },
          session: loginData.session,
          access_token: loginData.session?.access_token,
        });
      }

      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      user: {
        id: client.id,
        email: client.authEmail,
        companyName: client.companyName,
        role: 'client',
      },
      session: data.session,
      access_token: data.session?.access_token,
    });
  } catch (error: any) {
    console.error('Client login error:', error);
    res.status(500).json({ message: "Login failed" });
  }
});

/**
 * Admin logout - invalidate Supabase session
 */
router.post("/admin/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Sign out from Supabase
      await supabase.auth.admin.signOut(token);
    }

    res.json({ message: "Logged out successfully" });
  } catch (error: any) {
    console.error('Admin logout error:', error);
    res.json({ message: "Logged out successfully" }); // Always succeed
  }
});

/**
 * Client logout - invalidate Supabase session
 */
router.post("/client/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Sign out from Supabase
      await supabase.auth.admin.signOut(token);
    }

    res.json({ message: "Logged out successfully" });
  } catch (error: any) {
    console.error('Client logout error:', error);
    res.json({ message: "Logged out successfully" }); // Always succeed
  }
});

/**
 * Generic logout - invalidate Supabase session
 */
router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Sign out from Supabase
      await supabase.auth.admin.signOut(token);
    }

    res.json({ message: "Logged out successfully" });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.json({ message: "Logged out successfully" }); // Always succeed
  }
});

/**
 * Get current admin user
 */
router.get("/admin/me", requireAdminAuth, async (req, res) => {
  try {
    const user = req.supabaseUser;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || user.app_metadata?.role,
        ...user.user_metadata,
      }
    });
  } catch (error: any) {
    console.error('Get admin error:', error);
    res.status(500).json({ message: "Failed to get user info" });
  }
});

/**
 * Get current client user
 */
router.get("/client/me", requireClientAuth, async (req, res) => {
  try {
    const supabaseUser = req.supabaseUser;
    const clientId = supabaseUser.user_metadata?.client_id;

    if (!clientId) {
      return res.status(404).json({ message: "Client not found" });
    }

    const client = await storage.getClientById(clientId);
    
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.json({
      user: {
        id: client.id,
        email: client.authEmail,
        companyName: client.companyName,
        role: 'client',
      }
    });
  } catch (error: any) {
    console.error('Get client error:', error);
    res.status(500).json({ message: "Failed to get user info" });
  }
});

export { router as supabaseAuthRoutes };
