import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Email notification types
export type EmailNotificationType = 
  | 'trial-expiring-7days'
  | 'trial-expiring-3days' 
  | 'trial-expiring-1day'
  | 'trial-expired'
  | 'payment-reminder'
  | 'payment-failed'
  | 'subscription-reactivated';

// Email template data interface
export interface EmailTemplateData {
  clientName: string;
  companyName?: string;
  trialEndDate?: string;
  daysRemaining?: number;
  subscriptionType?: string;
  monthlyAmount?: number;
  paymentDueDate?: string;
  loginUrl?: string;
  supportEmail?: string;
  [key: string]: any;
}

// Email configuration interface
export interface EmailConfig {
  to: string;
  from?: string;
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
}

// Email delivery status
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;
  private templatesPath = path.join(__dirname, '../templates/emails');
  private templateCache = new Map<string, string>();

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    // Check for SMTP configuration
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      // Use SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.isConfigured = true;
      console.log('Email service configured with SMTP');
    } else {
      // Use test account for development
      console.log('Email service not fully configured. Creating test account...');
      await this.createTestAccount();
    }
  }

  private async createTestAccount() {
    try {
      const testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      
      this.isConfigured = true;
      console.log('Email service configured with test account');
      console.log(`Test credentials: ${testAccount.user} / ${testAccount.pass}`);
    } catch (error) {
      console.error('Failed to create test email account:', error);
      this.isConfigured = false;
    }
  }

  public isReady(): boolean {
    return this.isConfigured && this.transporter !== null;
  }

  /**
   * Send email using Nodemailer
   */
  async sendEmail(options: EmailConfig): Promise<EmailResult> {
    if (!this.isReady()) {
      console.warn('Email service not configured, skipping email send');
      return {
        success: false,
        error: 'Email service is not configured'
      };
    }

    try {
      const info = await this.transporter!.sendMail({
        from: options.from || process.env.DEFAULT_FROM_EMAIL || 'noreply@chatbotsaas.com',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      // If using Ethereal test account, log preview URL
      if (process.env.NODE_ENV === 'development' && info.messageId) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log('Email preview URL:', previewUrl);
        }
      }

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error: any) {
      console.error('Email sending failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  /**
   * Load email template from file system
   */
  async loadTemplate(templateType: EmailNotificationType): Promise<string> {
    const cacheKey = templateType;
    
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }
    
    try {
      const templatePath = path.join(this.templatesPath, `${templateType}.html`);
      const template = await fs.readFile(templatePath, 'utf-8');
      
      this.templateCache.set(cacheKey, template);
      return template;
    } catch (error) {
      console.warn(`Template not found for ${templateType}, using fallback`);
      
      const fallbackTemplate = this.getFallbackTemplate(templateType);
      this.templateCache.set(cacheKey, fallbackTemplate);
      
      return fallbackTemplate;
    }
  }

  /**
   * Generate fallback HTML template
   */
  getFallbackTemplate(templateType: EmailNotificationType): string {
    const baseTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); color: white; text-align: center; padding: 30px 20px; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .content { padding: 30px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-top: 1px solid #e5e7eb; }
        .button { display: inline-block; background: #3B82F6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .alert { padding: 16px; border-radius: 6px; margin: 20px 0; }
        .alert-warning { background: #FEF3C7; color: #92400E; border: 1px solid #F59E0B; }
        .alert-error { background: #FEE2E2; color: #991B1B; border: 1px solid #EF4444; }
        .alert-success { background: #D1FAE5; color: #065F46; border: 1px solid #10B981; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{companyName}}</h1>
        </div>
        <div class="content">
            {{content}}
        </div>
        <div class="footer">
            <p>Need help? Contact us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
            <p>&copy; 2025 {{companyName}}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;

    const contentMap: Record<EmailNotificationType, string> = {
      'trial-expiring-7days': `
        <h2>Your Trial Expires in 7 Days</h2>
        <div class="alert alert-warning">
          <strong>Action Required:</strong> Your trial will expire on {{trialEndDate}}
        </div>
        <p>Hi {{clientName}},</p>
        <p>Your chatbot trial will expire in <strong>7 days</strong>. Please upgrade to continue service.</p>
        <a href="{{loginUrl}}" class="button">Upgrade Now</a>
      `,
      'trial-expiring-3days': `
        <h2>Your Trial Expires in 3 Days</h2>
        <div class="alert alert-warning">
          <strong>Urgent:</strong> Your trial expires on {{trialEndDate}}
        </div>
        <p>Hi {{clientName}},</p>
        <p>Your chatbot trial expires in <strong>just 3 days</strong>. Please upgrade immediately.</p>
        <a href="{{loginUrl}}" class="button">Upgrade Now</a>
      `,
      'trial-expiring-1day': `
        <h2>Your Trial Expires Tomorrow!</h2>
        <div class="alert alert-error">
          <strong>Final Notice:</strong> Your trial expires tomorrow
        </div>
        <p>Hi {{clientName}},</p>
        <p>This is your final reminder to upgrade before service suspension.</p>
        <a href="{{loginUrl}}" class="button">Upgrade Now</a>
      `,
      'trial-expired': `
        <h2>Your Trial Has Expired</h2>
        <div class="alert alert-error">
          <strong>Service Suspended:</strong> Your chatbot has been deactivated
        </div>
        <p>Hi {{clientName}},</p>
        <p>Your trial has expired. Please upgrade to reactivate your service.</p>
        <a href="{{loginUrl}}" class="button">Reactivate Service</a>
      `,
      'payment-reminder': `
        <h2>Payment Reminder</h2>
        <div class="alert alert-warning">
          <strong>Payment Due:</strong> ${`{{monthlyAmount}}`} due soon
        </div>
        <p>Hi {{clientName}},</p>
        <p>Please ensure your payment method is up to date.</p>
        <a href="{{loginUrl}}" class="button">Update Payment</a>
      `,
      'payment-failed': `
        <h2>Payment Failed</h2>
        <div class="alert alert-error">
          <strong>Payment Issue:</strong> We couldn't process your payment
        </div>
        <p>Hi {{clientName}},</p>
        <p>Please update your payment method to avoid service interruption.</p>
        <a href="{{loginUrl}}" class="button">Update Payment Method</a>
      `,
      'subscription-reactivated': `
        <h2>Welcome Back!</h2>
        <div class="alert alert-success">
          <strong>Service Restored:</strong> Your subscription is now active
        </div>
        <p>Hi {{clientName}},</p>
        <p>Your subscription has been reactivated successfully.</p>
        <a href="{{loginUrl}}" class="button">Access Dashboard</a>
      `
    };

    return baseTemplate.replace('{{content}}', contentMap[templateType]);
  }

  /**
   * Replace template placeholders with data
   */
  renderTemplate(template: string, data: EmailTemplateData): string {
    let rendered = template;
    
    const defaultData = {
      companyName: 'Chatbot SaaS',
      supportEmail: 'support@chatbotsaas.com',
      loginUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/admin`,
      ...data
    };
    
    Object.entries(defaultData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        rendered = rendered.replace(placeholder, String(value));
      }
    });
    
    return rendered;
  }

  /**
   * Generate email subject based on type
   */
  generateSubject(type: EmailNotificationType, data: EmailTemplateData): string {
    const subjectMap: Record<EmailNotificationType, string> = {
      'trial-expiring-7days': `Your Trial Expires in 7 Days - Action Required`,
      'trial-expiring-3days': `Your Trial Expires in 3 Days - Urgent`,
      'trial-expiring-1day': `Your Trial Expires Tomorrow - Final Notice`,
      'trial-expired': `Your Trial Has Expired - Service Suspended`,
      'payment-reminder': `Payment Reminder - Action Required`,
      'payment-failed': `Payment Failed - Update Required`,
      'subscription-reactivated': `Welcome Back - Service Restored`
    };
    
    return subjectMap[type];
  }

  /**
   * Send notification email using template
   */
  async sendNotificationEmail(
    type: EmailNotificationType,
    config: Omit<EmailConfig, 'subject' | 'text' | 'html'> & { templateData: EmailTemplateData }
  ): Promise<EmailResult> {
    try {
      const template = await this.loadTemplate(type);
      const htmlContent = this.renderTemplate(template, config.templateData);
      const subject = this.generateSubject(type, config.templateData);
      const textContent = this.htmlToText(htmlContent);
      
      return await this.sendEmail({
        to: config.to,
        from: config.from,
        subject,
        text: textContent,
        html: htmlContent,
      });
      
    } catch (error: any) {
      console.error(`Failed to send ${type} email:`, error);
      return {
        success: false,
        error: error.message || 'Unknown email error'
      };
    }
  }

  /**
   * Convert HTML to plain text
   */
  htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Validate email address
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Test email service connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isReady()) {
        return { success: false, error: 'Email service not configured' };
      }

      // Verify transporter
      await this.transporter!.verify();
      return { success: true };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection test failed'
      };
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();