// Email notification scheduler and trigger logic
import { emailService, type EmailNotificationType, type EmailTemplateData } from './email.js';
import { supabaseStorage as storage } from '../storage-supabase.js';
import type { 
  Subscription, 
  SubscriptionWithClient, 
  Client, 
  EmailNotification,
  InsertEmailNotification 
} from 'server/shared/schema';

// Notification trigger configuration
interface NotificationTrigger {
  type: EmailNotificationType;
  daysBeforeExpiry?: number; // Days before expiry to trigger (null for immediate notifications)
  subscriptionStatuses: string[]; // Which subscription statuses can trigger this notification
  onlyOnce: boolean; // Whether to send only once per subscription lifecycle
}

// Notification scheduling configuration
const NOTIFICATION_TRIGGERS: NotificationTrigger[] = [
  {
    type: 'trial-expiring-7days',
    daysBeforeExpiry: 7,
    subscriptionStatuses: ['trial'],
    onlyOnce: true
  },
  {
    type: 'trial-expiring-3days', 
    daysBeforeExpiry: 3,
    subscriptionStatuses: ['trial'],
    onlyOnce: true
  },
  {
    type: 'trial-expiring-1day',
    daysBeforeExpiry: 1,
    subscriptionStatuses: ['trial'],
    onlyOnce: true
  },
  {
    type: 'trial-expired',
    daysBeforeExpiry: 0, // On expiry date
    subscriptionStatuses: ['expired'],
    onlyOnce: true
  },
  {
    type: 'payment-reminder',
    daysBeforeExpiry: 3, // 3 days before payment due
    subscriptionStatuses: ['active', 'payment_due'],
    onlyOnce: false
  },
  {
    type: 'payment-failed',
    daysBeforeExpiry: null, // Immediate when payment fails
    subscriptionStatuses: ['payment_due'],
    onlyOnce: false
  },
  {
    type: 'subscription-reactivated',
    daysBeforeExpiry: null, // Immediate when reactivated
    subscriptionStatuses: ['active'],
    onlyOnce: true
  }
];

// Default email settings for notifications (used if not configured by admin)
const DEFAULT_EMAIL_SETTINGS = {
  fromEmail: 'noreply@chatbotsaas.com',
  fromName: 'Chatbot SaaS',
  replyToEmail: 'support@chatbotsaas.com',
  enabled: true
};

export interface NotificationProcessingResult {
  processed: number;
  sent: number;
  skipped: number;
  errors: number;
  details: Array<{
    clientId: string;
    clientName: string;
    notificationType: EmailNotificationType;
    status: 'sent' | 'skipped' | 'error';
    reason?: string;
  }>;
}

export const notificationService = {
  /**
   * Main notification processing function - checks all subscriptions and sends appropriate notifications
   */
  async processAllNotifications(): Promise<NotificationProcessingResult> {
    console.log('🔄 Starting notification processing...');
    
    const result: NotificationProcessingResult = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
      details: []
    };

    try {
      // Get all subscriptions with their clients
      const subscriptions = await storage.getSubscriptionsWithClients();
      
      console.log(`📊 Found ${subscriptions.length} subscriptions to process`);

      // Process each subscription
      for (const subscription of subscriptions) {
        try {
          const subscriptionResult = await this.processSubscriptionNotifications(subscription);
          
          // Update result counters
          result.processed++;
          if (subscriptionResult.sent > 0) {
            result.sent += subscriptionResult.sent;
          }
          if (subscriptionResult.skipped > 0) {
            result.skipped += subscriptionResult.skipped;
          }
          if (subscriptionResult.errors > 0) {
            result.errors += subscriptionResult.errors;
          }
          
          // Add details
          result.details.push(...subscriptionResult.details);
          
        } catch (error) {
          console.error(`❌ Error processing subscription ${subscription.id}:`, error);
          result.errors++;
          result.details.push({
            clientId: subscription.clientId,
            clientName: subscription.client.name,
            notificationType: 'trial-expired', // Default type for error tracking
            status: 'error',
            reason: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.log(`✅ Notification processing complete: ${result.sent} sent, ${result.skipped} skipped, ${result.errors} errors`);
      return result;

    } catch (error) {
      console.error('❌ Critical error in notification processing:', error);
      throw error;
    }
  },

  /**
   * Process notifications for a single subscription
   */
  async processSubscriptionNotifications(subscription: SubscriptionWithClient): Promise<NotificationProcessingResult> {
    const result: NotificationProcessingResult = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
      details: []
    };

    // Check each notification trigger
    for (const trigger of NOTIFICATION_TRIGGERS) {
      try {
        const shouldSend = await this.shouldSendNotification(subscription, trigger);
        
        if (shouldSend) {
          const success = await this.sendNotificationForSubscription(subscription, trigger.type);
          
          if (success) {
            result.sent++;
            result.details.push({
              clientId: subscription.clientId,
              clientName: subscription.client.name,
              notificationType: trigger.type,
              status: 'sent'
            });
          } else {
            result.errors++;
            result.details.push({
              clientId: subscription.clientId,
              clientName: subscription.client.name,
              notificationType: trigger.type,
              status: 'error',
              reason: 'Email delivery failed'
            });
          }
        } else {
          result.skipped++;
          result.details.push({
            clientId: subscription.clientId,
            clientName: subscription.client.name,
            notificationType: trigger.type,
            status: 'skipped',
            reason: 'Conditions not met or already sent'
          });
        }
      } catch (error) {
        console.error(`Error processing ${trigger.type} for subscription ${subscription.id}:`, error);
        result.errors++;
        result.details.push({
          clientId: subscription.clientId,
          clientName: subscription.client.name,
          notificationType: trigger.type,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  },

  /**
   * Determine if a notification should be sent for a subscription
   */
  async shouldSendNotification(subscription: SubscriptionWithClient, trigger: NotificationTrigger): Promise<boolean> {
    // Check if subscription status matches trigger requirements
    if (!trigger.subscriptionStatuses.includes(subscription.status)) {
      return false;
    }

    // Check if notification is enabled (get from email settings)
    const isEnabled = await this.isNotificationEnabled(trigger.type);
    if (!isEnabled) {
      return false;
    }

    // Check if notification was already sent (for one-time notifications)
    if (trigger.onlyOnce) {
      const alreadySent = await this.wasNotificationAlreadySent(subscription.clientId, trigger.type);
      if (alreadySent) {
        return false;
      }
    }

    // Check timing for date-based triggers
    if (trigger.daysBeforeExpiry !== null && trigger.daysBeforeExpiry !== undefined) {
      const shouldSendBasedOnTiming = this.shouldSendBasedOnTiming(subscription, trigger.daysBeforeExpiry);
      if (!shouldSendBasedOnTiming) {
        return false;
      }
    }

    // Special logic for specific notification types
    return await this.checkSpecialConditions(subscription, trigger.type);
  },

  /**
   * Check if notification timing is correct
   */
  shouldSendBasedOnTiming(subscription: SubscriptionWithClient, daysBeforeExpiry: number): boolean {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let targetDate: Date;
    
    if (subscription.status === 'trial' && subscription.trialEnd) {
      // For trial notifications, calculate based on trial end date
      targetDate = new Date(subscription.trialEnd);
    } else if (subscription.status === 'active' && subscription.paidUntil) {
      // For payment notifications, calculate based on paid until date
      targetDate = new Date(subscription.paidUntil);
    } else {
      return false; // No valid date to calculate from
    }
    
    // Calculate the notification trigger date
    const triggerDate = new Date(targetDate);
    triggerDate.setDate(triggerDate.getDate() - daysBeforeExpiry);
    
    // Check if today is the trigger date
    return today.getTime() === new Date(triggerDate.getFullYear(), triggerDate.getMonth(), triggerDate.getDate()).getTime();
  },

  /**
   * Check special conditions for specific notification types
   */
  async checkSpecialConditions(subscription: SubscriptionWithClient, notificationType: EmailNotificationType): Promise<boolean> {
    switch (notificationType) {
      case 'trial-expired':
        // Only send if trial actually expired today
        if (!subscription.trialEnd) return false;
        const trialEndDate = new Date(subscription.trialEnd);
        const today = new Date();
        return trialEndDate.toDateString() === today.toDateString();
        
      case 'payment-failed':
        // Check if there's a recent failed payment
        const failedPayments = await storage.getPaymentsWithClients('failed', 'today');
        return failedPayments.some(payment => payment.clientId === subscription.clientId);
        
      case 'subscription-reactivated':
        // Only send if subscription was reactivated today
        const recentActivities = await storage.getRecentActivities();
        return recentActivities.some(activity => 
          activity.message.includes('reactivated') && 
          activity.message.includes(subscription.client.name) &&
          new Date(activity.timestamp).toDateString() === new Date().toDateString()
        );
        
      default:
        return true;
    }
  },

  /**
   * Send a notification for a specific subscription
   */
  async sendNotificationForSubscription(subscription: SubscriptionWithClient, notificationType: EmailNotificationType): Promise<boolean> {
    try {
      // Get email settings (or use defaults)
      const emailSettings = await this.getEmailSettings(notificationType);
      
      // Prepare template data
      const templateData = this.prepareTemplateData(subscription, notificationType);
      
      // Send the email
      const emailResult = await emailService.sendNotificationEmail(notificationType, {
        to: subscription.client.contactEmail,
        from: emailSettings.fromEmail,
        replyTo: emailSettings.replyToEmail,
        templateData
      });
      
      // Log the notification attempt
      await this.logNotification(subscription, notificationType, emailResult);
      
      return emailResult.success;
      
    } catch (error) {
      console.error(`Failed to send ${notificationType} notification to ${subscription.client.contactEmail}:`, error);
      
      // Log the failed attempt
      await this.logNotification(subscription, notificationType, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return false;
    }
  },

  /**
   * Prepare template data for email rendering
   */
  prepareTemplateData(subscription: SubscriptionWithClient, notificationType: EmailNotificationType): EmailTemplateData {
    const baseData: EmailTemplateData = {
      clientName: subscription.client.name,
      companyName: 'Chatbot SaaS',
      supportEmail: 'support@chatbotsaas.com',
      loginUrl: `${process.env.BASE_URL || 'https://your-domain.com'}/admin-login`,
      subscriptionType: subscription.type
    };

    // Add notification-specific data
    switch (notificationType) {
      case 'trial-expiring-7days':
      case 'trial-expiring-3days':
      case 'trial-expiring-1day':
      case 'trial-expired':
        if (subscription.trialEnd) {
          baseData.trialEndDate = new Date(subscription.trialEnd).toLocaleDateString();
          baseData.daysRemaining = Math.ceil((new Date(subscription.trialEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        }
        break;
        
      case 'payment-reminder':
      case 'payment-failed':
        if (subscription.paidUntil) {
          baseData.paymentDueDate = new Date(subscription.paidUntil).toLocaleDateString();
        }
        baseData.monthlyAmount = (subscription.monthlyAmount / 100).toFixed(2);
        break;
        
      case 'subscription-reactivated':
        // No additional data needed
        break;
    }

    return baseData;
  },

  /**
   * Check if a notification was already sent
   */
  async wasNotificationAlreadySent(clientId: string, notificationType: EmailNotificationType): Promise<boolean> {
    try {
      // This would need to be implemented in storage
      // For now, return false to allow sending (will be implemented when updating storage interface)
      return false;
    } catch (error) {
      console.error('Error checking notification history:', error);
      return false; // If we can't check, allow sending to avoid missing important notifications
    }
  },

  /**
   * Check if a notification type is enabled
   */
  async isNotificationEnabled(notificationType: EmailNotificationType): Promise<boolean> {
    try {
      // This would get settings from email_settings table
      // For now, return true to allow all notifications (will be implemented when updating storage interface)
      return true;
    } catch (error) {
      console.error('Error checking notification settings:', error);
      return true; // If we can't check, allow sending to avoid missing important notifications
    }
  },

  /**
   * Get email settings for a notification type
   */
  async getEmailSettings(notificationType: EmailNotificationType) {
    try {
      // This would get settings from email_settings table
      // For now, return defaults (will be implemented when updating storage interface)
      return DEFAULT_EMAIL_SETTINGS;
    } catch (error) {
      console.error('Error getting email settings:', error);
      return DEFAULT_EMAIL_SETTINGS;
    }
  },

  /**
   * Log notification attempt to database
   */
  async logNotification(
    subscription: SubscriptionWithClient, 
    notificationType: EmailNotificationType, 
    emailResult: { success: boolean; messageId?: string; error?: string }
  ): Promise<void> {
    try {
      // This would be implemented when updating storage interface
      console.log(`📧 Notification logged: ${notificationType} to ${subscription.client.contactEmail} - ${emailResult.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  },

  /**
   * Send a single notification manually (for testing or admin triggers)
   */
  async sendSingleNotification(
    clientId: string, 
    notificationType: EmailNotificationType
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get the subscription with client data
      const subscriptions = await storage.getSubscriptionsWithClients();
      const subscription = subscriptions.find(sub => sub.clientId === clientId);
      
      if (!subscription) {
        return { success: false, message: 'Subscription not found' };
      }

      // Send the notification
      const success = await this.sendNotificationForSubscription(subscription, notificationType);
      
      return {
        success,
        message: success ? 'Notification sent successfully' : 'Failed to send notification'
      };
      
    } catch (error) {
      console.error('Error sending single notification:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Get notification statistics for admin dashboard
   */
  async getNotificationStats(): Promise<{
    totalSent: number;
    sentToday: number;
    failureRate: number;
    byType: Record<EmailNotificationType, number>;
  }> {
    try {
      // This would be implemented when updating storage interface
      // For now, return mock data
      return {
        totalSent: 0,
        sentToday: 0,
        failureRate: 0,
        byType: {
          'trial-expiring-7days': 0,
          'trial-expiring-3days': 0,
          'trial-expiring-1day': 0,
          'trial-expired': 0,
          'payment-reminder': 0,
          'payment-failed': 0,
          'subscription-reactivated': 0
        }
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  },

  /**
   * Test notification system with a dry run
   */
  async testNotificationSystem(): Promise<NotificationProcessingResult> {
    console.log('🧪 Running notification system test (dry run)...');
    
    const result: NotificationProcessingResult = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
      details: []
    };

    try {
      const subscriptions = await storage.getSubscriptionsWithClients();
      
      for (const subscription of subscriptions) {
        result.processed++;
        
        // Test each trigger condition
        for (const trigger of NOTIFICATION_TRIGGERS) {
          const shouldSend = await this.shouldSendNotification(subscription, trigger);
          
          if (shouldSend) {
            console.log(`✅ Would send ${trigger.type} to ${subscription.client.name} (${subscription.client.contactEmail})`);
            result.sent++;
          } else {
            result.skipped++;
          }
          
          result.details.push({
            clientId: subscription.clientId,
            clientName: subscription.client.name,
            notificationType: trigger.type,
            status: shouldSend ? 'sent' : 'skipped',
            reason: shouldSend ? 'Test mode - would send' : 'Conditions not met'
          });
        }
      }
      
      console.log(`🧪 Test complete: ${result.sent} notifications would be sent out of ${result.processed} subscriptions processed`);
      return result;
      
    } catch (error) {
      console.error('❌ Error in notification test:', error);
      throw error;
    }
  }
};