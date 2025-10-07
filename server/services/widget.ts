import { randomUUID } from "crypto";

export const widgetService = {
  generateWidgetUrl(): string {
    const widgetId = randomUUID();
    const baseUrl = process.env.WIDGET_BASE_URL || "https://widgets.chatbotsaas.com";
    return `${baseUrl}/embed/${widgetId}`;
  },

  generateEmbedCode(widgetUrl: string): string {
    return `<script src="${widgetUrl}.js"></script>`;
  },

  generateWidgetScript(chatbotConfig: any): string {
    return `
(function() {
  const config = ${JSON.stringify(chatbotConfig)};
  
  // Create widget container
  const widget = document.createElement('div');
  widget.id = 'chatbot-widget-' + Math.random().toString(36).substr(2, 9);
  widget.style.cssText = \`
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  \`;
  
  // Add widget to page
  document.body.appendChild(widget);
  
  // Initialize widget
  if (typeof initChatWidget === 'function') {
    initChatWidget(widget, config);
  }
})();
    `.trim();
  },

  validateWidgetAccess(chatbotId: string, subscriptionStatus: string): { allowed: boolean; reason?: string } {
    if (subscriptionStatus === "expired") {
      return { allowed: false, reason: "Subscription expired" };
    }
    
    if (subscriptionStatus === "suspended") {
      return { allowed: false, reason: "Subscription suspended" };
    }
    
    if (subscriptionStatus === "cancelled") {
      return { allowed: false, reason: "Subscription cancelled" };
    }
    
    return { allowed: true };
  },

  generateIframeCode(widgetUrl: string, width: number = 350, height: number = 500): string {
    return `<iframe src="${widgetUrl}" width="${width}" height="${height}" frameborder="0" style="border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);"></iframe>`;
  },

  extractWidgetIdFromUrl(widgetUrl: string): string | null {
    const match = widgetUrl.match(/\/embed\/([a-f0-9-]+)/);
    return match ? match[1] : null;
  },

  sanitizeConfig(config: any): any {
    // Remove any potentially dangerous configuration
    const sanitized = JSON.parse(JSON.stringify(config));
    
    // Ensure required properties exist
    if (!sanitized.theme) sanitized.theme = {};
    if (!sanitized.behavior) sanitized.behavior = {};
    if (!sanitized.integrations) sanitized.integrations = {};
    
    // Set defaults
    sanitized.theme.primaryColor = sanitized.theme.primaryColor || "#3b82f6";
    sanitized.theme.backgroundColor = sanitized.theme.backgroundColor || "#ffffff";
    sanitized.theme.textColor = sanitized.theme.textColor || "#000000";
    
    sanitized.behavior.greeting = sanitized.behavior.greeting || "Hello! How can I help you today?";
    sanitized.behavior.fallbackMessage = sanitized.behavior.fallbackMessage || "I'm sorry, I didn't understand that. Could you please rephrase?";
    sanitized.behavior.maxTokens = Math.min(sanitized.behavior.maxTokens || 150, 500);
    
    return sanitized;
  },
};
