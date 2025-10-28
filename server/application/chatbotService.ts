import { supabaseStorage as storage } from "../storage-supabase";
import { insertChatbotSchema } from "../shared/schema";
import { widgetService } from "../services/widget";
import { supabaseService } from "../services/supabase";

export class ChatbotService {
  /**
   * Get all chatbots with their clients
   */
  async getChatbotsWithClients() {
    try {
      return await storage.getChatbotsWithClients();
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get a chatbot by ID
   */
  async getChatbot(id: string) {
    try {
      return await storage.getChatbot(id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new chatbot
   */
  async createChatbot(data: any) {
    try {
      const validatedData = insertChatbotSchema.parse(data);
      const widgetUrl = widgetService.generateWidgetUrl();
      
      const chatbot = await storage.createChatbot({
        ...validatedData,
        widgetUrl,
      });

      return chatbot;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update chatbot status
   */
  async updateChatbotStatus(id: string, status: string) {
    try {
      return await storage.updateChatbotStatus(id, status);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update chatbot configuration
   */
  async updateChatbotConfig(id: string, config: any) {
    try {
      return await storage.updateChatbotConfig(id, config);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update chatbot details (name and description)
   */
  async updateChatbotDetails(id: string, data: { name?: string; description?: string }) {
    try {
      // Use the new storage method to update the chatbot details
      return await storage.updateChatbotDetails(id, data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload logo for chatbot
   */
  async uploadLogo(chatbotId: string, file: Express.Multer.File) {
    try {
      // Check if chatbot exists
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot) {
        throw new Error("Chatbot not found");
      }

      // Check if Supabase is configured
      if (!supabaseService.isAvailable()) {
        // Fallback: Store as base64 in the config (not recommended for production)
        const base64Logo = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        const updatedConfig = {
          ...(chatbot.config as any || {}),
          branding: {
            ...((chatbot.config as any)?.branding || {}),
            logoUrl: base64Logo,
          },
        };
        await storage.updateChatbotConfig(chatbotId, updatedConfig);
        return { 
          logoUrl: base64Logo,
          warning: "Logo stored as base64. Configure Supabase for better performance.",
        };
      }

      // Delete old logo if it exists
      const config = chatbot.config as any;
      if (config?.branding?.logoUrl && !config.branding.logoUrl.startsWith('data:')) {
        try {
          await supabaseService.deleteFile(config.branding.logoUrl);
        } catch (error) {
          console.error("Failed to delete old logo:", error);
        }
      }

      // Upload new logo to Supabase
      const logoUrl = await supabaseService.uploadFile(
        chatbotId,
        file.buffer,
        file.mimetype
      );

      // Update chatbot config with new logo URL
      const updatedConfig = {
        ...(config || {}),
        branding: {
          ...(config?.branding || {}),
          logoUrl,
        },
      };

      await storage.updateChatbotConfig(chatbotId, updatedConfig);

      return { 
        logoUrl,
        message: "Logo uploaded successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete logo for chatbot
   */
  async deleteLogo(chatbotId: string) {
    try {
      // Check if chatbot exists
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot) {
        throw new Error("Chatbot not found");
      }

      const config = chatbot.config as any;
      const logoUrl = config?.branding?.logoUrl;
      if (!logoUrl) {
        throw new Error("No logo to delete");
      }

      // Delete from Supabase if it's a Supabase URL (not base64)
      if (!logoUrl.startsWith('data:') && supabaseService.isAvailable()) {
        try {
          await supabaseService.deleteFile(logoUrl);
        } catch (error) {
          console.error("Failed to delete logo from storage:", error);
        }
      }

      // Update chatbot config to remove logo URL
      const updatedConfig = {
        ...(config || {}),
        branding: {
          ...(config?.branding || {}),
          logoUrl: undefined,
        },
      };

      await storage.updateChatbotConfig(chatbotId, updatedConfig);

      return { 
        message: "Logo deleted successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload background image for chatbot
   */
  async uploadBackgroundImage(chatbotId: string, file: Express.Multer.File) {
    try {
      // Check if chatbot exists
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot) {
        throw new Error("Chatbot not found");
      }

      // Check if Supabase is configured
      if (!supabaseService.isAvailable()) {
        throw new Error("Supabase storage not configured. Background images require cloud storage.");
      }

      // Delete old background image if it exists
      const config = chatbot.config as any;
      if (config?.branding?.backgroundImageUrl) {
        try {
          await supabaseService.deleteFile(config.branding.backgroundImageUrl);
        } catch (error) {
          console.error("Failed to delete old background image:", error);
        }
      }

      // Upload new background image to Supabase with optimization
      const backgroundImageUrl = await supabaseService.uploadFile(
        `${chatbotId}-background`,
        file.buffer,
        file.mimetype
      );

      // Update chatbot config with new background image URL
      const updatedConfig = {
        ...(config || {}),
        branding: {
          ...(config?.branding || {}),
          backgroundImageUrl,
        },
      };

      await storage.updateChatbotConfig(chatbotId, updatedConfig);

      return { 
        backgroundImageUrl,
        message: "Background image uploaded successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete background image for chatbot
   */
  async deleteBackgroundImage(chatbotId: string) {
    try {
      // Check if chatbot exists
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot) {
        throw new Error("Chatbot not found");
      }

      const config = chatbot.config as any;
      const backgroundImageUrl = config?.branding?.backgroundImageUrl;
      if (!backgroundImageUrl) {
        throw new Error("No background image to delete");
      }

      // Delete from Supabase
      if (supabaseService.isAvailable()) {
        try {
          await supabaseService.deleteFile(backgroundImageUrl);
        } catch (error) {
          console.error("Failed to delete background image from storage:", error);
        }
      }

      // Update chatbot config to remove background image URL
      const updatedConfig = {
        ...(config || {}),
        branding: {
          ...(config?.branding || {}),
          backgroundImageUrl: undefined,
        },
      };

      await storage.updateChatbotConfig(chatbotId, updatedConfig);

      return { 
        message: "Background image deleted successfully",
      };
    } catch (error) {
      throw error;
    }
  }
}

export const chatbotService = new ChatbotService();