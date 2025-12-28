import { Router } from "express";
import express from "express";
import { requireAdminAuth } from "../middleware/auth.js";
import { widgetApplicationService } from "../application/widgetService.js";

const router = Router();

// Admin widget management routes
router.get("/admin/widgets", requireAdminAuth, async (req, res) => {
  try {
    const widgets = await widgetApplicationService.getWidgetsWithAnalytics();
    res.json(widgets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/admin/widgets/:id/regenerate", requireAdminAuth, async (req, res) => {
  try {
    const result = await widgetApplicationService.regenerateWidgetUrl(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Public widget routes (no auth required)
router.get("/widget/:chatbotId", async (req, res) => {
  try {
    console.log(`Widget request for chatbot ID: ${req.params.chatbotId}`);
    const chatbot = await widgetApplicationService.getChatbotForWidget(req.params.chatbotId);

    if (!chatbot) {
      console.log(`Chatbot not found with ID: ${req.params.chatbotId}`);
      return res.status(404).json({ message: "Chatbot not found" });
    }

    // Apply URL parameter overrides for language settings
    const { lang, adaptLang } = req.query;
    if (lang && typeof lang === 'string') {
      const config = chatbot.config as any || {};
      config.behavior = config.behavior || {};
      config.behavior.mainLanguage = lang;
      chatbot.config = config;
    }
    if (adaptLang !== undefined) {
      const config = chatbot.config as any || {};
      config.behavior = config.behavior || {};
      config.behavior.adaptToCustomerLanguage = adaptLang === 'true' || adaptLang === '1';
      chatbot.config = config;
    }

    console.log(`Found chatbot: ${chatbot.id} (${chatbot.name})`);
    res.json(chatbot);
  } catch (error: any) {
    if (error.message === "Chatbot not found") {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === "Chatbot unavailable") {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Get embed code for widget
router.get("/widget/:chatbotId/embed-code", async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const { mode = 'floating' } = req.query;

    // Get the current domain from the request
    const protocol = req.secure ? 'https' : 'http';
    const host = req.get('host') || 'localhost:5000';
    const baseUrl = `${protocol}://${host}`;

    const result = await widgetApplicationService.generateEmbedCode(chatbotId, mode as string, baseUrl);
    res.json(result);
  } catch (error: any) {
    if (error.message === "Chatbot not found") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Lead capture endpoint for widgets
router.post("/widget/:chatbotId/capture-lead", express.json(), async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const result = await widgetApplicationService.captureLead(chatbotId, req.body);
    res.json(result);
  } catch (error: any) {
    console.error("Error capturing lead:", error);
    if (error.message === "Chatbot not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Widget message processing
router.post("/widget/:chatbotId/message", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const result = await widgetApplicationService.processMessage(req.params.chatbotId, message, sessionId);
    res.json(result);
  } catch (error: any) {
    console.error(`Widget message processing error for chatbot ${req.params.chatbotId}:`, error);

    res.status(500).json({
      response: error.message || "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
      responseOptions: undefined
    });
  }
});

// Serve the widget loader script
router.get("/widget-embed.js", (req, res) => {
  const protocol = req.secure ? 'https' : 'http';
  const host = req.get('host') || 'localhost:5000';

  // Use VITE_CLIENT_URL for dev if present, otherwise use host
  const widgetBaseUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : `${protocol}://${host}`;

  const apiBaseUrl = `${protocol}://${host}`;

  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
(function() {
  const script = document.currentScript;
  const chatbotId = script.getAttribute('data-chatbot-id');
  if (!chatbotId) return;

  const widgetBaseUrl = "${widgetBaseUrl}";
  const apiBaseUrl = "${apiBaseUrl}";
  const containerId = "automiqa-widget-container-" + chatbotId;
  
  if (document.getElementById(containerId)) return;

  const container = document.createElement('div');
  container.id = containerId;
  container.style.position = 'fixed';
  container.style.zIndex = '999999';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.width = '80px';
  container.style.height = '80px';
  container.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  container.style.pointerEvents = 'none';

  const iframe = document.createElement('iframe');
  iframe.src = widgetBaseUrl + "/widget/" + chatbotId;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '24px';
  iframe.style.overflow = 'hidden';
  iframe.style.pointerEvents = 'auto';
  iframe.style.boxShadow = 'none';
  iframe.style.transition = 'all 0.3s ease';
  iframe.title = "Chat Support";

  container.appendChild(iframe);
  document.body.appendChild(container);

  window.addEventListener('message', function(event) {
    if (event.origin !== widgetBaseUrl && event.origin !== apiBaseUrl) return;
    
    if (event.data.type === 'widget-status') {
      if (event.data.isOpen) {
        if (event.data.isMinimized) {
          container.style.width = '350px';
          container.style.height = '80px';
        } else {
          container.style.width = window.innerWidth < 500 ? 'calc(100vw - 40px)' : '400px';
          container.style.height = window.innerWidth < 500 ? 'calc(100vh - 40px)' : '600px';
        }
        iframe.style.boxShadow = '0 10px 40px rgba(0,0,0,0.15)';
      } else {
        container.style.width = '80px';
        container.style.height = '80px';
        iframe.style.boxShadow = 'none';
      }
    }
  });
})();
  `);
});

export { router as widgetRoutes };