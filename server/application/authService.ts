import bcrypt from "bcrypt";
import { supabaseStorage as storage } from "../storage-supabase";

export class AuthService {
  /**
   * Authenticate admin user
   */
  async authenticateAdmin(username: string, password: string) {
    try {
      const admin = await storage.getAdminByUsername(username);
      if (!admin) {
        return { success: false, message: "Invalid username or password" };
      }

      const isValid = await bcrypt.compare(password, admin.password);
      if (!isValid) {
        return { success: false, message: "Invalid username or password" };
      }

      return { 
        success: true, 
        user: { ...admin, role: 'admin' as const }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Authenticate client user
   */
  async authenticateClient(authEmail: string, password: string) {
    try {
      const client = await storage.getClientByAuthEmail(authEmail);
      if (!client || !client.password_hash) {
        return { success: false, message: "Invalid email or password" };
      }

      const isValid = await bcrypt.compare(password, client.password_hash);
      if (!isValid) {
        return { success: false, message: "Invalid email or password" };
      }

      return { 
        success: true, 
        user: { ...client, role: 'client' as const }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user by ID and role for session deserialization
   */
  async getUserById(id: string, role: 'admin' | 'client') {
    try {
      if (role === 'admin') {
        const admin = await storage.getAdmin(id);
        if (admin) {
          return { ...admin, role: 'admin' as const };
        }
      } else if (role === 'client') {
        const client = await storage.getClient(id);
        if (client) {
          return { ...client, role: 'client' as const };
        }
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Extract user data for API responses
   */
  getAdminUserData(user: any) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
  }

  /**
   * Extract client data for API responses
   */
  getClientUserData(user: any) {
    return {
      id: user.id,
      name: user.name,
      contactEmail: user.contact_email,
      authEmail: user.auth_email,
      industry: user.industry,
      description: user.description,
      status: user.status,
      role: user.role,
      createdAt: user.created_at
    };
  }
}

export const authService = new AuthService();