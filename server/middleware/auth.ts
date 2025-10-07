import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  next();
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const user = req.user as any;
    // Handle user role - admin users have explicit role, clients are identified by user type
    const userRole = user.role || (user.auth_email ? "client" : "admin");
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    next();
  };
}

export function requireClientAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const user = req.user as any;
  // Client users have auth_email field (snake_case from database), admin users don't
  if (!user.auth_email && user.role !== 'client') {
    return res.status(403).json({ message: "Client access required" });
  }
  
  next();
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const user = req.user as any;
  // Admin users have username field, client users don't
  if (!user.username) {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Allow request to continue regardless of authentication status
  next();
}
