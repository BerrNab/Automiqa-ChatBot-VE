import { supabaseStorage as storage } from "../storage-supabase";

export class SubscriptionService {
  /**
   * Get subscriptions with clients, optionally filtered by status
   */
  async getSubscriptionsWithClients(statusFilter?: string) {
    try {
      return await storage.getSubscriptionsWithClients(statusFilter);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create new subscription for a client
   */
  async createSubscription(data: any) {
    try {
      return await storage.createSubscription(data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Convert trial to paid subscription
   */
  async convertTrialToPaid(subscriptionId: string, data: any) {
    try {
      return await storage.convertTrialToPaid(subscriptionId, data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Extend trial period
   */
  async extendTrial(subscriptionId: string, days: number = 7) {
    try {
      return await storage.extendTrial(subscriptionId, days);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Suspend subscription
   */
  async suspendSubscription(subscriptionId: string) {
    try {
      return await storage.suspendSubscription(subscriptionId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(subscriptionId: string) {
    try {
      return await storage.reactivateSubscription(subscriptionId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process subscription action based on action type
   */
  async processSubscriptionAction(subscriptionId: string, action: string, data: any) {
    switch (action) {
      case "convert-to-paid":
        return await this.convertTrialToPaid(subscriptionId, data);
      case "extend-trial":
        return await this.extendTrial(subscriptionId, data.days || 7);
      case "suspend":
        return await this.suspendSubscription(subscriptionId);
      case "reactivate":
        return await this.reactivateSubscription(subscriptionId);
      default:
        throw new Error("Invalid action");
    }
  }
}

export const subscriptionService = new SubscriptionService();