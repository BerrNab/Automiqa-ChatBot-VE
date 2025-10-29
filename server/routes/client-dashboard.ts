import { Router } from "express";
import express from "express";
import { requireClientAuth } from "../middleware/auth.js";
import { leadService } from "../application/leadService.js";
import { supabaseStorage as storage } from "../storage-supabase.js";

const router = Router();

// Get client's appointments
router.get("/client/appointments", requireClientAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const appointments = await storage.getAppointmentsByClientId(user.id);
    res.json(appointments);
  } catch (error: any) {
    console.error(`Error fetching appointments for client ${(req.user as any)?.id}:`, error);
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
});

// Get client's conversations/chats
router.get("/client/chats", requireClientAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const conversations = await storage.getConversationsByClientId(user.id);
    
    // Sort by most recent activity first (lastMessageAt or startedAt)
    const sortedConversations = conversations.sort((a, b) => {
      const aDate = a.lastMessageAt || a.startedAt;
      const bDate = b.lastMessageAt || b.startedAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    
    res.json(sortedConversations);
  } catch (error: any) {
    console.error(`Error fetching conversations for client ${(req.user as any)?.id}:`, error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

// Get messages for a specific conversation
router.get("/client/chats/:conversationId/messages", requireClientAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const { conversationId } = req.params;
    
    // Get conversation with messages and ownership validation
    const conversationWithMessages = await storage.getConversationById(conversationId, user.id);
    
    if (!conversationWithMessages) {
      return res.status(404).json({ message: "Conversation not found or access denied" });
    }
    
    res.json(conversationWithMessages);
  } catch (error: any) {
    console.error(`Error fetching messages for conversation ${req.params.conversationId}, client ${(req.user as any)?.id}:`, error);
    res.status(500).json({ message: "Failed to fetch conversation messages" });
  }
});

// Get client's chatbots
router.get("/client/chatbots", requireClientAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const chatbots = await storage.getChatbotsWithClients();
    // Filter to only return chatbots belonging to this client
    const clientChatbots = chatbots.filter(chatbot => chatbot.client.id === user.id);
    res.json(clientChatbots);
  } catch (error: any) {
    console.error(`Error fetching chatbots for client ${(req.user as any)?.id}:`, error);
    res.status(500).json({ message: "Failed to fetch chatbots" });
  }
});

// Get client's leads (saved information)
router.get("/client/leads", requireClientAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const leads = await leadService.getLeadsByClientId(user.id);
    res.json(leads);
  } catch (error: any) {
    console.error(`Error fetching leads for client ${(req.user as any)?.id}:`, error);
    res.status(500).json({ message: "Failed to fetch leads" });
  }
});

// Get leads for a specific chatbot
router.get("/client/chatbots/:chatbotId/leads", requireClientAuth, async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const user = req.user as any;
    
    const leads = await leadService.getLeadsByChatbotId(chatbotId, user.id);
    res.json(leads);
  } catch (error: any) {
    console.error("Error fetching chatbot leads:", error);
    if (error.message.startsWith("Forbidden:")) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update lead status
router.patch("/client/leads/:leadId", requireClientAuth, express.json(), async (req, res) => {
  try {
    const { leadId } = req.params;
    const { status, notes } = req.body;
    const user = req.user as any;
    
    const updatedLead = await leadService.updateLeadStatus(leadId, status, notes, user.id);
    res.json(updatedLead);
  } catch (error: any) {
    console.error("Error updating lead status:", error);
    if (error.message.startsWith("Forbidden:")) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

export { router as clientDashboardRoutes };