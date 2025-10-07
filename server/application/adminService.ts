import { supabaseStorage as storage } from "../storage-supabase";

export class AdminService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      return await storage.getDashboardStats();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get recent activities
   */
  async getRecentActivities() {
    try {
      return await storage.getRecentActivities();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get subscription status overview
   */
  async getSubscriptionStatus() {
    try {
      return await storage.getSubscriptionStatus();
    } catch (error) {
      throw error;
    }
  }
}

export const adminService = new AdminService();