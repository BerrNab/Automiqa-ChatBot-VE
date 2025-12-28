import express from "express";
import { supabaseStorage as storage } from "../storage-supabase.js";
import { widgetService as originalWidgetService } from "../services/widget.js";
import { openaiService } from "../services/openai.js";
import { mcpService } from "../services/mcp.js";
import { langchainAgentService } from "../services/langchain-agent.js";
import { chatbotConfigSchema } from "../shared/schema.js";
import type { InsertLead } from "../shared/schema.js";
import { simpleChatService } from "../services/simple-chat.js";

interface ChatResponse {
  message: string;
  responseOptions?: any;
  links?: Array<{ title: string, url: string }>;
}

export class WidgetApplicationService {
  /**
   * Get widgets with analytics
   */
  async getWidgetsWithAnalytics() {
    try {
      return await storage.getWidgetsWithAnalytics();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Regenerate widget URL
   */
  async regenerateWidgetUrl(chatbotId: string) {
    try {
      const newWidgetUrl = originalWidgetService.generateWidgetUrl();
      const chatbot = await storage.updateChatbotWidgetUrl(chatbotId, newWidgetUrl);
      return { widgetUrl: newWidgetUrl };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get chatbot for widget display
   */
  async getChatbotForWidget(chatbotId: string) {
    try {
      console.log(`WidgetApplicationService: Getting chatbot for widget with ID: ${chatbotId}`);
      const chatbot = await storage.getChatbotForWidget(chatbotId);

      if (!chatbot) {
        console.log(`WidgetApplicationService: Chatbot not found with ID: ${chatbotId}`);
        throw new Error("Chatbot not found");
      }

      console.log(`WidgetApplicationService: Found chatbot ${chatbot.id} (${chatbot.name})`);

      // Check if subscription is active
      if (chatbot.subscription?.status === "expired" || chatbot.status !== "active") {
        console.log(`WidgetApplicationService: Chatbot unavailable - status: ${chatbot.status}, subscription: ${chatbot.subscription?.status}`);
        throw new Error("Chatbot unavailable");
      }

      // Track widget view
      await storage.trackWidgetView(chatbotId);

      return chatbot;
    } catch (error) {
      console.error(`WidgetApplicationService: Error getting chatbot for widget:`, error);
      throw error;
    }
  }

  /**
   * Generate embed code for widget
   */
  async generateEmbedCode(chatbotId: string, mode: string, baseUrl: string) {
    try {
      // Validate chatbot exists
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot) {
        throw new Error("Chatbot not found");
      }

      let embedCode: string;

      if (mode === 'fullpage') {
        // Fullpage iframe embed code
        embedCode = `<!-- Fullpage Chat Widget -->
<iframe 
  id="chatbot-fullpage-${chatbotId}"
  src="${baseUrl}/widget/${chatbotId}/fullpage"
  style="width: 100%; height: 600px; border: none; border-radius: 8px; overflow: hidden;"
  title="${chatbot.name} Chat"
  allowfullscreen>
</iframe>

<script>
  // Optional: Auto-resize iframe to fit content
  window.addEventListener('message', function(e) {
    if (e.origin !== '${baseUrl}') return;
    const frame = document.getElementById('chatbot-fullpage-${chatbotId}');
    if (frame && e.data.height) {
      frame.style.height = e.data.height + 'px';
    }
  });
</script>`;
      } else {
        // Floating widget embed code (default)
        embedCode = `<!-- Automiqa Chat Widget - Floating -->
<script 
  src="${baseUrl}/widget-embed.js" 
  data-chatbot-id="${chatbotId}"
  async>
</script>`;
      }

      return {
        embedCode,
        mode: mode as string,
        chatbotId,
        chatbotName: chatbot.name
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Capture lead from widget
   */
  async captureLead(chatbotId: string, leadData: any) {
    try {
      const { name, email, phone, message, conversationId, source } = leadData;

      // Validate chatbot exists
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot) {
        throw new Error("Chatbot not found");
      }

      // Check if lead already exists for this conversation or email
      const existingLead = await storage.checkExistingLead(chatbotId, conversationId, email);
      if (existingLead) {
        // Update existing lead with new information
        const updatedLead = await storage.updateLead(
          existingLead.id,
          {
            name: name || existingLead.name,
            email: email || existingLead.email,
            phone: phone || existingLead.phone,
            message: message || existingLead.message,
          },
          chatbot.clientId
        );
        return { lead: updatedLead, isNew: false };
      }

      // Create new lead
      const lead = await storage.createLead({
        clientId: chatbot.clientId,
        chatbotId,
        conversationId,
        name,
        email,
        phone,
        message,
        source: source || "widget",
        status: "new",
      });

      return { lead, isNew: true };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process widget message
   */
  async processMessage(chatbotId: string, message: string, sessionId?: string) {
    try {
      const chatbot = await storage.getChatbotForWidget(chatbotId);

      if (!chatbot) {
        throw new Error("Chatbot not found");
      }

      // Check if subscription is active
      if (chatbot.subscription?.status === "expired" || chatbot.status !== "active") {
        throw new Error("Chatbot unavailable");
      }

      // Persist conversation - find or create conversation for this session
      let conversation;
      try {
        conversation = await storage.createOrUpdateConversation({
          sessionId: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          chatbotId: chatbotId,
          clientId: chatbot.clientId || chatbot.client?.id || 'unknown_client'
        });
      } catch (convError: any) {
        console.error(`Conversation persistence error for chatbot ${chatbotId}:`, convError);
        // Continue without conversation tracking - don't break chat flow
        conversation = null;
      }

      // Store user message
      if (conversation) {
        try {
          await storage.createMessage({
            conversationId: conversation.id,
            content: message,
            role: "user"
          });
        } catch (msgError: any) {
          console.error(`User message persistence error for conversation ${conversation.id}:`, msgError);
          // Continue processing - don't break chat flow
        }
      }

      // Validate and process message with LangChain agent
      let responseText: string;

      try {
        // Validate chatbot configuration using Zod schema
        const validatedConfig = chatbotConfigSchema.parse(chatbot.config);

        // Create context for the agent
        const agentContext = {
          clientId: chatbot.clientId || chatbot.client?.id || 'unknown_client',
          chatbotId: chatbotId,
          sessionId: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          conversationId: conversation?.id
        };

        // Use simple chat service (bypasses LangChain complexity)
        console.log(`[Widget] Processing message with Simple Chat for chatbot ${chatbotId}`);
        responseText = await simpleChatService.processMessage(message, validatedConfig, agentContext);

      } catch (configError: any) {
        console.error(`Agent processing error for chatbot ${chatbotId}:`, configError);

        // Fallback to basic OpenAI processing
        const fallbackConfig: any = {
          behavior: {
            welcomeMessage: "Hello! How can I help you today?",
            suggestedPrompts: [],
            fallbackMessage: "I'm sorry, I'm experiencing some technical difficulties. Please try again later.",
            aiPersonality: "professional",
            systemPrompt: "You are a helpful assistant."
          }
        };
        const fallbackResponse = await openaiService.processMessage(message, fallbackConfig);
        responseText = fallbackResponse.message;
      }

      // Extract response options if present (from simple chat service)
      let responseOptions: string[] | undefined;
      const optionsMatch = responseText.match(/__RESPONSE_OPTIONS__(.+?)(?=\n|$)/);
      if (optionsMatch) {
        try {
          responseOptions = JSON.parse(optionsMatch[1]);
          // Remove the options marker from the response text
          responseText = responseText.replace(/__RESPONSE_OPTIONS__.+?(?=\n|$)/, '').trim();
        } catch (e) {
          console.error('[Widget] Failed to parse response options:', e);
        }
      }

      // Extract links if present
      let links: Array<{ title: string, url: string }> | undefined;
      const linksMatch = responseText.match(/__LINKS__(.+?)(?=\n|$)/);
      if (linksMatch) {
        try {
          links = JSON.parse(linksMatch[1]);
          // Remove the links marker from the response text
          responseText = responseText.replace(/__LINKS__.+?(?=\n|$)/, '').trim();
        } catch (e) {
          console.error('[Widget] Failed to parse links:', e);
        }
      }

      // Fallback: detect response options from the text
      // Only use auto-detection if no explicit options were provided via __RESPONSE_OPTIONS__
      // This prevents duplicates when the AI includes numbered lists in the response
      if (!responseOptions && !optionsMatch) {
        responseOptions = openaiService.detectResponseOptions(responseText);
      }

      const response: ChatResponse = { message: responseText, responseOptions, links };

      // Store AI response
      if (conversation) {
        try {
          await storage.createMessage({
            conversationId: conversation.id,
            content: response.message,
            role: "assistant"
          });
        } catch (msgError: any) {
          console.error(`AI response persistence error for conversation ${conversation.id}:`, msgError);
          // Continue processing - don't break chat flow
        }
      }

      // Track interaction
      await storage.trackWidgetInteraction(chatbotId);
      await storage.incrementMessageCount(chatbotId);

      return {
        response: response.message,
        responseOptions: response.responseOptions
      };
    } catch (error: any) {
      console.error(`Widget message processing error for chatbot ${chatbotId}:`, error);

      throw new Error("I'm sorry, I'm having trouble processing your request right now. Please try again later.");
    }
  }
}

export const widgetApplicationService = new WidgetApplicationService();