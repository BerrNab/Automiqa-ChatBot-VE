import { ChatOpenAI } from "@langchain/openai";
import { supabaseStorage as storage } from "../storage-supabase";
import { openaiService } from "./openai";
import type { ChatbotConfig } from "../shared/schema";

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

      // Step 1: Search knowledge base if enabled
      let kbResults = '';
      if (config.knowledgeBase?.enabled || config.mcpTools?.enabled) {
        console.log('[SimpleChat] Searching knowledge base...');
        
        try {
          // Create embedding for the query
          const queryEmbedding = await openaiService.createEmbedding(message);
          
          // Search for similar chunks
          const results = await storage.searchKBChunks(context.chatbotId, queryEmbedding, 5);
          
          if (results.length > 0) {
            console.log(`[SimpleChat] Found ${results.length} relevant chunks`);
            kbResults = '\n\nRELEVANT INFORMATION FROM KNOWLEDGE BASE:\n';
            results.forEach((chunk, idx) => {
              kbResults += `\n[${idx + 1}] (Relevance: ${(chunk.similarity * 100).toFixed(1)}%)\n${chunk.text}\n`;
            });
            kbResults += `\n\n**KNOWLEDGE BASE RESULTS:**
Found ${results.length} relevant items. 

**RESPONSE GUIDELINES:**
1. Provide a brief summary (2-3 sentences) mentioning the available information
2. DO NOT list items in your message - they will be shown as clickable buttons
3. Ask the user which specific item they want to learn more about
4. Keep your response concise and conversational

**SUGGESTED PROMPTS FORMAT:**
At the end of your response, you MUST add a special section with clickable options.
Format it EXACTLY like this (use the actual item names from the results):

---SUGGESTED_PROMPTS---
[Short item 1 name (max 6 words)]
[Short item 2 name (max 6 words)]
[Short item 3 name (max 6 words)]
---END_PROMPTS---

CRITICAL RULES:
- Include MAXIMUM 3 suggested prompts
- Each prompt should be SHORT (6 words max)
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
        maxTokens: 2000, // Increased to prevent truncation
      });

      const response = await model.invoke(messages);
      let responseText = response.content.toString();
      // Extract links from KB results
      const links: Array<{title: string, url: string}> = [];
      if (kbResults) {
        const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
        const foundUrls = kbResults.match(urlRegex);
        if (foundUrls) {
          foundUrls.forEach((url, idx) => {
            // Try to extract context around the URL for a better title
            const urlIndex = kbResults.indexOf(url);
            const contextBefore = kbResults.substring(Math.max(0, urlIndex - 50), urlIndex).trim();
            const words = contextBefore.split(/\s+/).slice(-5).join(' ');
            links.push({
              title: words || `Link ${idx + 1}`,
              url: url
            });
          });
        }
      }

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
        
        // Remove numbered list that duplicates the suggested prompts
        // This removes lists like "1. **Item**" or "1. Item" that appear in the message
        if (prompts.length > 0) {
          // Remove each prompt from the response text if it appears as a numbered item
          prompts.forEach((prompt, index) => {
            const cleanPrompt = prompt.replace(/\*\*/g, '').trim();
            // Match patterns like "1. **prompt**" or "1. prompt" or "١. prompt" (Arabic numerals)
            const patterns = [
              new RegExp(`\\n?\\s*${index + 1}\\.\\s*\\*\\*${cleanPrompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*\\s*`, 'gi'),
              new RegExp(`\\n?\\s*${index + 1}\\.\\s*${cleanPrompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'gi'),
            ];
            patterns.forEach(pattern => {
              responseText = responseText.replace(pattern, '');
            });
          });
          
          // Clean up any remaining empty lines or extra whitespace
          responseText = responseText.replace(/\n{3,}/g, '\n\n').trim();
          
          // Add prompts as a JSON object at the end (will be parsed by frontend)
          responseText += `\n\n__RESPONSE_OPTIONS__${JSON.stringify(prompts)}`;
        }
      }

      // Add links if found
      if (links.length > 0) {
        responseText += `\n\n__LINKS__${JSON.stringify(links)}`;
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
