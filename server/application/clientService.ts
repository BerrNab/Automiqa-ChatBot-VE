import bcrypt from "bcrypt";
import { supabaseStorage as storage } from "../storage-supabase";
import { insertClientSchema } from "../shared/schema";

export class ClientService {
  /**
   * Get all clients with their chatbots
   */
  async getClientsWithChatbots() {
    try {
      return await storage.getClientsWithChatbots();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new client
   */
  async createClient(data: any) {
    try {
      const validatedData = insertClientSchema.parse(data);
      const client = await storage.createClient(validatedData);
      
      // Create a trial subscription for the new client
      await storage.createSubscription({
        clientId: client.id,
        type: "trial",
        status: "trial",
        trialStart: new Date(),
        trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        monthlyAmount: 0,
      });

      return client;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a client
   */
  async updateClient(id: string, data: any) {
    try {
      const validatedData = insertClientSchema.partial().parse(data);
      return await storage.updateClient(id, validatedData);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a client
   */
  async deleteClient(id: string) {
    try {
      return await storage.deleteClient(id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Set client credentials for portal access
   */
  async setClientCredentials(clientId: string, authEmail: string, password: string) {
    try {
      // Check if client exists
      const client = await storage.getClient(clientId);
      if (!client) {
        throw new Error("Client not found");
      }
      
      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Set client credentials
      await storage.setClientCredentials(clientId, authEmail, passwordHash);
      
      return { authEmail };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Revoke client portal access
   */
  async revokeClientCredentials(clientId: string) {
    try {
      // Check if client exists
      const client = await storage.getClient(clientId);
      if (!client) {
        throw new Error("Client not found");
      }
      
      // Revoke credentials by setting authEmail and passwordHash to empty
      await storage.setClientCredentials(clientId, "", "");
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get client portal status
   */
  async getClientPortalStatus(clientId: string, baseUrl: string) {
    try {
      // Check if client exists
      const client = await storage.getClient(clientId);
      if (!client) {
        throw new Error("Client not found");
      }
      
      const hasAccess = !!(client.auth_email && client.password_hash);
      const portalUrl = `${baseUrl}/client/login`;
      
      return {
        hasAccess,
        authEmail: client.auth_email || null,
        lastLogin: null, // TODO: Implement last login tracking
        portalUrl
      };
    } catch (error) {
      throw error;
    }
  }
}

export const clientService = new ClientService();