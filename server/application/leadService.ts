import { supabaseStorage as storage } from "../storage-supabase";

export class LeadService {
  /**
   * Get leads by client ID
   */
  async getLeadsByClientId(clientId: string) {
    try {
      return await storage.getLeadsByClientId(clientId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get leads by chatbot ID with client validation
   */
  async getLeadsByChatbotId(chatbotId: string, clientId: string) {
    try {
      // Verify chatbot belongs to client
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot || chatbot.clientId !== clientId) {
        throw new Error("Forbidden: Chatbot does not belong to this client");
      }
      
      return await storage.getLeadsByChatbotId(chatbotId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update lead status with client validation
   */
  async updateLeadStatus(leadId: string, status: string, notes: string, clientId: string) {
    try {
      // Verify lead belongs to client
      const leads = await storage.getLeadsByClientId(clientId);
      const lead = leads.find(l => l.id === leadId);
      if (!lead) {
        throw new Error("Forbidden: Lead does not belong to this client");
      }
      
      return await storage.updateLeadStatus(leadId, status, notes);
    } catch (error) {
      throw error;
    }
  }
}

export const leadService = new LeadService();