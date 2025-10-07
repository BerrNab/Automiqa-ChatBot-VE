// Email notification API routes
import { Router } from "express";
import { z } from "zod";
import { supabaseStorage as storage } from "../storage-supabase";
import { notificationService } from "../services/notifications";
import { emailService } from "../services/email";
import { insertEmailSettingsSchema, insertEmailNotificationSchema } from "@shared/schema";
import { requireAdminAuth } from "../middleware/auth";

export const emailNotificationRoutes = Router();

// Apply admin authentication to all email notification routes
emailNotificationRoutes.use(requireAdminAuth);

// Email Settings Management Routes

/**
 * GET /api/email-notifications/settings
 * Get all email notification settings or filter by type
 */
emailNotificationRoutes.get("/settings", async (req, res) => {
  try {
    const { type } = req.query;
    const settings = await storage.getEmailSettings(type as string);
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error("Error fetching email settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch email settings"
    });
  }
});

/**
 * POST /api/email-notifications/settings
 * Create new email notification settings
 */
emailNotificationRoutes.post("/settings", async (req, res) => {
  try {
    const validatedData = insertEmailSettingsSchema.parse(req.body);
    const settings = await storage.createEmailSettings(validatedData);
    
    res.status(201).json({
      success: true,
      data: settings,
      message: "Email notification settings created successfully"
    });
  } catch (error) {
    console.error("Error creating email settings:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Invalid email settings data",
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to create email settings"
      });
    }
  }
});

/**
 * PUT /api/email-notifications/settings/:id
 * Update existing email notification settings
 */
emailNotificationRoutes.put("/settings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = insertEmailSettingsSchema.partial().parse(req.body);
    
    const updatedSettings = await storage.updateEmailSettings(id, updateData);
    
    res.json({
      success: true,
      data: updatedSettings,
      message: "Email notification settings updated successfully"
    });
  } catch (error) {
    console.error("Error updating email settings:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Invalid update data",
        details: error.errors
      });
    } else if (error instanceof Error && error.message === "Email settings not found") {
      res.status(404).json({
        success: false,
        error: "Email settings not found"
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to update email settings"
      });
    }
  }
});

/**
 * DELETE /api/email-notifications/settings/:id
 * Delete email notification settings
 */
emailNotificationRoutes.delete("/settings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteEmailSettings(id);
    
    res.json({
      success: true,
      message: "Email notification settings deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting email settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete email settings"
    });
  }
});

// Email Notification History Routes

/**
 * GET /api/email-notifications/history
 * Get email notification history with filtering
 */
emailNotificationRoutes.get("/history", async (req, res) => {
  try {
    const {
      clientId,
      type,
      status,
      dateFrom,
      dateTo,
      limit = "50"
    } = req.query;

    const filters: any = {};
    if (clientId) filters.clientId = clientId as string;
    if (type) filters.notificationType = type as string;
    if (status) filters.deliveryStatus = status as string;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);
    if (limit) filters.limit = parseInt(limit as string);

    const notifications = await storage.getEmailNotifications(filters);
    
    // Get client information for each notification for better display
    const notificationsWithClients = await Promise.all(
      notifications.map(async (notification) => {
        const client = await storage.getClient(notification.clientId);
        return {
          ...notification,
          client: client ? {
            id: client.id,
            name: client.name,
            contactEmail: client.contactEmail
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: notificationsWithClients,
      total: notificationsWithClients.length
    });
  } catch (error) {
    console.error("Error fetching notification history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch notification history"
    });
  }
});

/**
 * GET /api/email-notifications/stats
 * Get email notification statistics
 */
emailNotificationRoutes.get("/stats", async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const filters: { dateFrom?: Date; dateTo?: Date } = {};
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);

    const stats = await storage.getEmailNotificationStats(filters.dateFrom, filters.dateTo);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error fetching notification stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch notification statistics"
    });
  }
});

// Notification Processing Routes

/**
 * POST /api/email-notifications/process
 * Manually trigger notification processing (runs the scheduler)
 */
emailNotificationRoutes.post("/process", async (req, res) => {
  try {
    console.log("🔄 Manual notification processing triggered by admin");
    const result = await notificationService.processAllNotifications();
    
    res.json({
      success: true,
      data: result,
      message: `Processing complete: ${result.sent} notifications sent, ${result.skipped} skipped, ${result.errors} errors`
    });
  } catch (error) {
    console.error("Error processing notifications:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process notifications",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/email-notifications/test
 * Test notification system with dry run (doesn't actually send emails)
 */
emailNotificationRoutes.post("/test", async (req, res) => {
  try {
    console.log("🧪 Test notification processing triggered by admin");
    const result = await notificationService.testNotificationSystem();
    
    res.json({
      success: true,
      data: result,
      message: `Test complete: ${result.sent} notifications would be sent out of ${result.processed} subscriptions`
    });
  } catch (error) {
    console.error("Error testing notifications:", error);
    res.status(500).json({
      success: false,
      error: "Failed to test notification system",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Manual Notification Triggers

/**
 * POST /api/email-notifications/send-manual
 * Manually send a notification to a specific client
 */
emailNotificationRoutes.post("/send-manual", async (req, res) => {
  try {
    const schema = z.object({
      clientId: z.string(),
      notificationType: z.enum([
        'trial-expiring-7days',
        'trial-expiring-3days', 
        'trial-expiring-1day',
        'trial-expired',
        'payment-reminder',
        'payment-failed',
        'subscription-reactivated'
      ])
    });

    const { clientId, notificationType } = schema.parse(req.body);
    
    const result = await notificationService.sendSingleNotification(clientId, notificationType);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error("Error sending manual notification:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Invalid notification request",
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to send notification"
      });
    }
  }
});

// Email Service Status Routes

/**
 * GET /api/email-notifications/service-status
 * Get email service configuration and health status
 */
emailNotificationRoutes.get("/service-status", async (req, res) => {
  try {
    // Check if SendGrid is configured
    const isConfigured = !!process.env.SENDGRID_API_KEY;
    
    // Get notification stats for health check
    const stats = await storage.getEmailNotificationStats();
    
    const status = {
      configured: isConfigured,
      serviceName: "SendGrid",
      lastProcessed: new Date().toISOString(),
      stats: {
        totalSent: stats.totalSent,
        delivered: stats.delivered,
        failed: stats.failed,
        pending: stats.pending,
        successRate: stats.totalSent > 0 ? Math.round((stats.delivered / stats.totalSent) * 100) : 0
      }
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error("Error getting service status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get service status"
    });
  }
});

/**
 * POST /api/email-notifications/test-email
 * Send a test email to verify email service is working
 */
emailNotificationRoutes.post("/test-email", async (req, res) => {
  try {
    const schema = z.object({
      to: z.string().email(),
      subject: z.string().optional().default("Test Email from Chatbot SaaS"),
      message: z.string().optional().default("This is a test email to verify the email service is working correctly.")
    });

    const { to, subject, message } = schema.parse(req.body);
    
    // Send a simple test email
    const result = await emailService.sendEmail({
      to,
      from: 'noreply@chatbotsaas.com',
      subject,
      text: message,
      html: `<p>${message}</p>`
    });

    if (result.success) {
      res.json({
        success: true,
        message: "Test email sent successfully",
        data: { messageId: result.messageId }
      });
    } else {
      res.status(400).json({
        success: false,
        error: "Failed to send test email",
        details: result.error
      });
    }
  } catch (error) {
    console.error("Error sending test email:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Invalid email data",
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to send test email"
      });
    }
  }
});

// Notification Templates Routes

/**
 * GET /api/email-notifications/templates
 * Get list of available email templates
 */
emailNotificationRoutes.get("/templates", async (req, res) => {
  try {
    const templates = [
      {
        type: 'trial-expiring-7days',
        name: 'Trial Expiring (7 Days)',
        description: 'Sent 7 days before trial expiration',
        urgency: 'low'
      },
      {
        type: 'trial-expiring-3days',
        name: 'Trial Expiring (3 Days)', 
        description: 'Sent 3 days before trial expiration',
        urgency: 'medium'
      },
      {
        type: 'trial-expiring-1day',
        name: 'Trial Expiring (1 Day)',
        description: 'Sent 1 day before trial expiration',
        urgency: 'high'
      },
      {
        type: 'trial-expired',
        name: 'Trial Expired',
        description: 'Sent when trial expires',
        urgency: 'high'
      },
      {
        type: 'payment-reminder',
        name: 'Payment Reminder',
        description: 'Sent for upcoming payment due dates',
        urgency: 'medium'
      },
      {
        type: 'payment-failed',
        name: 'Payment Failed',
        description: 'Sent when payment processing fails',
        urgency: 'high'
      },
      {
        type: 'subscription-reactivated',
        name: 'Subscription Reactivated',
        description: 'Sent when subscription is reactivated',
        urgency: 'low'
      }
    ];

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error("Error getting templates:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get templates"
    });
  }
});

/**
 * POST /api/email-notifications/preview-template
 * Preview an email template with sample data
 */
emailNotificationRoutes.post("/preview-template", async (req, res) => {
  try {
    const schema = z.object({
      type: z.enum([
        'trial-expiring-7days',
        'trial-expiring-3days',
        'trial-expiring-1day', 
        'trial-expired',
        'payment-reminder',
        'payment-failed',
        'subscription-reactivated'
      ]),
      clientId: z.string().optional()
    });

    const { type, clientId } = schema.parse(req.body);
    
    // Get client data if provided, otherwise use sample data
    let client;
    if (clientId) {
      client = await storage.getClient(clientId);
    }
    
    const sampleData = {
      clientName: client?.name || "John Smith",
      companyName: "Chatbot SaaS",
      supportEmail: "support@chatbotsaas.com",
      loginUrl: "https://your-domain.com/admin-login",
      subscriptionType: "Pro Plan",
      trialEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      paymentDueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      monthlyAmount: "49.99",
      daysRemaining: 3
    };

    // In a real implementation, you'd render the template with the data
    // For now, return the sample data and template info
    res.json({
      success: true,
      data: {
        type,
        templateData: sampleData,
        preview: `Preview for ${type} template with sample data`
      }
    });
  } catch (error) {
    console.error("Error previewing template:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Invalid preview request",
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to preview template"
      });
    }
  }
});