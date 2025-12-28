import { ChatOpenAI } from "@langchain/openai";
import { supabaseStorage as storage } from "../storage-supabase.js";
import { openaiService } from "./openai.js";
import type { ChatbotConfig } from "../shared/schema.js";

interface ConversationContext {
  chatbotId: string;
  sessionId: string;
  conversationId?: string;
  clientId: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Simple Chat Service - Direct implementation without LangChain agents
 * This bypasses the complex agent logic and directly searches the KB
 */
export class SimpleChatService {
  private conversations: Map<string, ChatMessage[]> = new Map();

  /**
   * Process a message with direct KB search
   */
  async processMessage(
    message: string,
    config: ChatbotConfig,
    context: ConversationContext,
    chatHistory: Array<{ role: string; content: string }> = []
  ): Promise<string> {
    try {
      console.log(`[SimpleChat] Processing message for chatbot ${context.chatbotId}: "${message.substring(0, 50)}..."`);

      // Get or create conversation history
      const conversationKey = `${context.chatbotId}_${context.sessionId}`;
      if (!this.conversations.has(conversationKey)) {
        this.conversations.set(conversationKey, []);
      }
      const history = this.conversations.get(conversationKey)!;

      // Step 1: Search knowledge base if available
      let kbResults = '';
      if (config.knowledgeBase) {
        console.log('[SimpleChat] Searching knowledge base...');

        try {
          // Create embedding for the query
          const queryEmbedding = await openaiService.createEmbedding(message);

          // Search for similar chunks (using hybrid search)
          const results = await storage.searchKBChunks(context.chatbotId, queryEmbedding, 5, message);

          if (results.length > 0) {
            console.log(`[SimpleChat] Found ${results.length} relevant chunks`);
            kbResults = '\n\nRELEVANT INFORMATION FROM KNOWLEDGE BASE:\n';
            results.forEach((chunk, idx) => {
              kbResults += `\n[${idx + 1}] (Relevance: ${(chunk.similarity * 100).toFixed(1)}%)\n${chunk.text}\n`;
            });
            kbResults += `\n\n**KNOWLEDGE BASE RESULTS:**
Found ${results.length} relevant items. 

Ask the user which specific item they want to learn more about
Keep your response concise and conversational

CRITICAL RULES:
- Use actual names from the search results
- These will be shown as clickable buttons
- DO NOT include a numbered list in your message text`;
          } else {
            console.log('[SimpleChat] No relevant chunks found');
          }
        } catch (error) {
          console.error('[SimpleChat] KB search error:', error);
        }
      }

      // Step 2: Build messages for GPT
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: openaiService.buildSystemPrompt(config) + kbResults
        },
        ...history,
        {
          role: 'user',
          content: message
        }
      ];

      // Step 3: Call GPT-4 directly
      console.log('[SimpleChat] Calling GPT-4...');
      const model = new ChatOpenAI({
        modelName: "gpt-4o",
        temperature: 0.7,
        openAIApiKey: process.env.OPENAI_API_KEY,
        maxTokens: 5000, // Increased to prevent truncation
      });

      const response = await model.invoke(messages);
      let responseText = response.content.toString();

      // Extract suggested prompts if present
      const promptMatch = responseText.match(/---SUGGESTED_PROMPTS---([\s\S]*?)---END_PROMPTS---/);
      if (promptMatch) {
        const prompts = promptMatch[1]
          .trim()
          .split('\n')
          .filter(p => p.trim())
          .slice(0, 3); // Max 3 prompts

        // Remove the prompts section from the response
        responseText = responseText.replace(/---SUGGESTED_PROMPTS---[\s\S]*?---END_PROMPTS---/, '').trim();
      }

      // Step 4: Update conversation history
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: responseText });

      // Keep only last 10 messages
      if (history.length > 10) {
        history.splice(0, history.length - 10);
      }

      console.log(`[SimpleChat] Response generated (${responseText.length} chars)`);
      return responseText;

    } catch (error: any) {
      console.error('[SimpleChat] Error:', error);
      return config.behavior?.fallbackMessage || 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.';
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(chatbotId: string, sessionId: string): void {
    const conversationKey = `${chatbotId}_${sessionId}`;
    this.conversations.delete(conversationKey);
    console.log(`[SimpleChat] Cleared history for ${conversationKey}`);
  }
}

export const simpleChatService = new SimpleChatService();
