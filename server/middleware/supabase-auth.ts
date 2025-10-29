import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import config from "../config.js";

// Supabase client for auth verification
const supabase = createClient(
  config.supabaseUrl!,
  config.supabaseAnonKey!
);

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      supabaseUser?: any;
    }
  }
}

/**
 * Middleware to verify Supabase JWT token from Authorization header
 */
export async function verifySupabaseAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Attach user to request
    req.supabaseUser = user;
    req.user = user;
    
    next();
  } catch (error: any) {
    console.error('Auth verification error:', error);
    return res.status(401).json({ message: "Authentication failed" });
  }
}

/**
 * Optional auth - doesn't fail if no token provided
 */
export async function optionalSupabaseAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        req.supabaseUser = user;
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}

/**
 * Require admin role from Supabase user metadata
 */
export async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No Authorization header or invalid format');
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.substring(7);
    console.log('🔍 Verifying token:', token.substring(0, 20) + '...');
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('❌ Token verification failed:', error?.message);
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Check if user has admin role
    const role = user.user_metadata?.role || user.app_metadata?.role;
    console.log('✅ User authenticated:', user.email, 'Role:', role);
    
    if (role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.supabaseUser = user;
    req.user = user;
    
    next();
  } catch (error: any) {
    console.error('Admin auth error:', error);
    return res.status(401).json({ message: "Authentication failed" });
  }
}

/**
 * Require client role
 */
export async function requireClientAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Check if user has client role
    const role = user.user_metadata?.role || user.app_metadata?.role;
    
    if (role !== 'client') {
      return res.status(403).json({ message: "Client access required" });
    }

    req.supabaseUser = user;
    req.user = user;
    
    next();
  } catch (error: any) {
    console.error('Client auth error:', error);
    return res.status(401).json({ message: "Authentication failed" });
  }
}
