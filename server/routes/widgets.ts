import { Router } from "express";
import express from "express";
import { requireAdminAuth } from "../middleware/auth";
import { widgetApplicationService } from "../application/widgetService";

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
      chatbot.config = chatbot.config || {};
      chatbot.config.behavior = chatbot.config.behavior || {};
      chatbot.config.behavior.mainLanguage = lang;
    }
    if (adaptLang !== undefined) {
      chatbot.config = chatbot.config || {};
      chatbot.config.behavior = chatbot.config.behavior || {};
      chatbot.config.behavior.adaptToCustomerLanguage = adaptLang === 'true' || adaptLang === '1';
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

export { router as widgetRoutes };