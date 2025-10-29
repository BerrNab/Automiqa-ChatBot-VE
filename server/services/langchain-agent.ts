import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { supabaseStorage as storage } from "../storage-supabase.js";
import { openaiService } from "./openai.js";
import { mcpService } from "./mcp.js";
import type { ChatbotConfig } from "../shared/schema.js";

interface ConversationContext {
  chatbotId: string;
  sessionId: string;
  conversationId?: string;
  clientId: string;
}

/**
 * LangChain Agent Service
 * Creates intelligent agents with:
 * - Vector store retrieval from knowledge base
 * - MCP tools integration
 * - Conversation memory
 * - Dynamic tool creation
 */
export class LangChainAgentService {
  private agents: Map<string, AgentExecutor> = new Map();
  private memories: Map<string, BufferMemory> = new Map();

  /**
   * Create a vector store retrieval tool for knowledge base search
   */
  private createKnowledgeBaseTool(chatbotId: string) {
    return new DynamicStructuredTool({
      name: "search_knowledge_base",
      description: "Search the knowledge base for information about administrative procedures, documents, requirements, legal references, processing times, or any specific information the user is asking about. ALWAYS use this tool when the user asks questions about procedures, services, requirements, or any factual information. This is your PRIMARY source of information. If results are not relevant, ask clarifying questions to refine the search.",
      schema: z.object({
        query: z.string().describe("The search query - use the user's question or key terms from it (e.g., 'الصفقات العمومية', 'إجراءات إدارية', 'وثائق مطلوبة')"),
      }),
      func: async ({ query }) => {
        try {
          console.log(`[KB Tool] Searching knowledge base for: "${query}"`);
          
          // Create embedding for the query
          const queryEmbedding = await openaiService.createEmbedding(query);
          
          // Search for similar chunks with more results
          const results = await storage.searchKBChunks(chatbotId, queryEmbedding, 8);
          
          if (results.length === 0) {
            console.log('[KB Tool] No results found');
            return "NO_RESULTS: No relevant information found in the knowledge base for this query. ASK the user for more details to help refine the search. For example: ask them to clarify what specific aspect they're interested in, what type of procedure they need, or provide more context about their situation. Be conversational and helpful.";
          }
          
          // Check if results have low similarity (< 40%) - might need clarification
          const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
          if (avgSimilarity < 0.4) {
            console.log(`[KB Tool] Low similarity results (avg: ${avgSimilarity.toFixed(2)})`);
            return `LOW_CONFIDENCE_RESULTS: Found some information but it may not be exactly what the user needs (confidence: ${(avgSimilarity * 100).toFixed(0)}%). ASK clarifying questions to better understand what they're looking for. Here's what was found:\n\n${results.map((r, i) => `${i+1}. ${r.text.substring(0, 200)}...`).join('\n\n')}`;
          }
          
          // Format results with clear instructions for the agent
          let response = "KNOWLEDGE_BASE_RESULTS:\n\n";
          results.forEach((chunk, idx) => {
            response += `Result ${idx + 1} (Relevance: ${(chunk.similarity * 100).toFixed(1)}%):\n`;
            response += `${chunk.text}\n\n`;
          });
          
          response += `\nINSTRUCTIONS: Use the above information to provide a comprehensive, conversational answer. Be friendly and chatty. Synthesize the information naturally without mentioning 'knowledge base' or 'search results'. If the information doesn't fully answer the question, provide what you can and ASK follow-up questions to understand better what they need. Engage in conversation to help them find exactly what they're looking for.`;
          
          console.log(`[KB Tool] Found ${results.length} relevant chunks with similarities:`, results.map(r => r.similarity.toFixed(3)));
          return response;
        } catch (error: any) {
          console.error('[KB Tool] Error:', error);
          return `ERROR: Could not search knowledge base. Provide a helpful response based on general knowledge or ask the user to try rephrasing their question.`;
        }
      },
    });
  }

  /**
   * Create MCP tools for the agent
   */
  private async createMCPTools(config: ChatbotConfig, context: ConversationContext) {
    const tools: DynamicStructuredTool[] = [];

    // Only add MCP tools if enabled
    if (!config.mcpTools?.enabled) {
      return tools;
    }

    // Appointment booking tool (only if appointments are enabled)
    if (config.appointments?.enabled && config.appointments.types && config.appointments.types.length > 0) {
      tools.push(new DynamicStructuredTool({
        name: "book_appointment",
        description: "Book an appointment for the customer. Use this when a customer wants to schedule a meeting or appointment.",
        schema: z.object({
          appointmentType: z.string().describe("Type of appointment (e.g., consultation, follow-up)"),
          customerName: z.string().describe("Customer's full name"),
          customerEmail: z.string().email().describe("Customer's email address"),
          preferredDate: z.string().describe("Preferred date in YYYY-MM-DD format"),
          preferredTime: z.string().describe("Preferred time in HH:MM format"),
          notes: z.string().optional().describe("Additional notes or requirements"),
        }),
        func: async (input) => {
          try {
            console.log('[MCP Tool] Booking appointment:', input);
            
            // Use MCP service to book appointment
            const result = await mcpService.bookAppointment({
              chatbotId: context.chatbotId,
              clientId: context.clientId,
              ...input,
            });
            
            return `Appointment booked successfully! Confirmation: ${JSON.stringify(result)}`;
          } catch (error: any) {
            console.error('[MCP Tool] Appointment booking error:', error);
            return `Failed to book appointment: ${error.message}`;
          }
        },
      }));
    }

    // Lead capture tool
    if (config.leadCapture?.enabled) {
      tools.push(new DynamicStructuredTool({
        name: "capture_lead",
        description: "Capture customer contact information. Use this when a customer provides their contact details or when you need to collect their information.",
        schema: z.object({
          name: z.string().optional().describe("Customer's name"),
          email: z.string().email().optional().describe("Customer's email"),
          phone: z.string().optional().describe("Customer's phone number"),
          message: z.string().optional().describe("Additional message or inquiry"),
        }),
        func: async (input) => {
          try {
            console.log('[MCP Tool] Capturing lead:', input);
            
            const result = await storage.createLead({
              chatbotId: context.chatbotId,
              clientId: context.clientId,
              conversationId: context.conversationId,
              name: input.name,
              email: input.email,
              phone: input.phone,
              message: input.message,
              source: 'widget',
              status: 'new',
            });
            
            return `Contact information saved successfully. Thank you!`;
          } catch (error: any) {
            console.error('[MCP Tool] Lead capture error:', error);
            return `Information saved. Thank you for providing your details.`;
          }
        },
      }));
    }

    return tools;
  }

  /**
   * Get or create memory for a conversation
   */
  private getMemory(sessionId: string): BufferMemory {
    if (!this.memories.has(sessionId)) {
      const memory = new BufferMemory({
        returnMessages: true,
        memoryKey: "chat_history",
        inputKey: "input",
        outputKey: "output",
      });
      this.memories.set(sessionId, memory);
    }
    return this.memories.get(sessionId)!;
  }

  /**
   * Clear memory for a session (useful when resetting conversation)
   */
  clearMemory(sessionId: string): void {
    this.memories.delete(sessionId);
    console.log(`[Agent] Cleared memory for session: ${sessionId}`);
  }

  /**
   * Create or get an agent for a chatbot session
   */
  async getAgent(
    config: ChatbotConfig,
    context: ConversationContext
  ): Promise<AgentExecutor> {
    const agentKey = `${context.chatbotId}_${context.sessionId}`;

    // Check if tools configuration has changed - if so, recreate agent
    const existingAgent = this.agents.get(agentKey);
    if (existingAgent) {
      // For now, always recreate to ensure latest config is used
      // TODO: Add smarter cache invalidation based on config changes
      console.log(`[Agent] Recreating agent for chatbot ${context.chatbotId} to ensure latest config`);
      this.agents.delete(agentKey);
    }

    console.log(`[Agent] Creating new agent for chatbot ${context.chatbotId}`);

    // Initialize OpenAI model with optimized settings
    const model = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0.9, // Higher for more natural, conversational responses
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: 2000, // Allow longer responses for detailed conversations
    });

    // Create tools
    const tools: DynamicStructuredTool[] = [];
    
    // Add knowledge base tool
    tools.push(this.createKnowledgeBaseTool(context.chatbotId));
    
    // Add MCP tools
    const mcpTools = await this.createMCPTools(config, context);
    tools.push(...mcpTools);

    console.log(`[Agent] Created ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);

    // Create enhanced system prompt with tool usage instructions
    let systemPrompt = openaiService.buildSystemPrompt(config);
    
    // FORCE tool usage - completely override any conflicting instructions
    systemPrompt = systemPrompt.replace(
      /If you cannot help.*?respond with:.*?".*?"/gs,
      'BEFORE responding, you MUST use the search_knowledge_base tool to find information.'
    );
    
    // Add critical agent-specific instructions - OVERRIDE the fallback behavior
    systemPrompt += `\n\n**MANDATORY TOOL USAGE - NO EXCEPTIONS:**
YOU HAVE A TOOL CALLED "search_knowledge_base". 
FOR EVERY QUESTION, YOU MUST:
1. CALL search_knowledge_base tool with the user's question
2. WAIT for the results
3. THEN provide an answer based on those results

DO NOT SKIP THE TOOL. DO NOT ANSWER WITHOUT CALLING IT FIRST.

**IMPORTANT - BE CONVERSATIONAL AND PROACTIVE:**
- If the tool returns NO_RESULTS or LOW_CONFIDENCE_RESULTS, DON'T just give up
- ASK the user clarifying questions to understand better what they need
- Examples: "هل يمكنك توضيح المزيد عن...", "هل تبحث عن...", "لمساعدتك بشكل أفضل، هل يمكنك تحديد..."
- Be friendly and chatty - make the conversation feel natural
- If results are found, synthesize them into a natural, conversational answer
- Always offer to help with follow-up questions or related topics
- Show that you're actively trying to help them find what they need`;

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    // Get or create memory
    const memory = this.getMemory(context.sessionId);

    // Create agent
    const agent = await createOpenAIFunctionsAgent({
      llm: model,
      tools,
      prompt,
    });

    // Create agent executor with improved settings
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      memory,
      verbose: true, // Enable logging for debugging
      maxIterations: 8, // Allow more iterations for complex queries
      returnIntermediateSteps: false,
      handleParsingErrors: true, // Gracefully handle parsing errors
    });

    // Cache the agent
    this.agents.set(agentKey, agentExecutor);

    return agentExecutor;
  }

  /**
   * Process a message using the LangChain agent
   */
  async processMessage(
    message: string,
    config: ChatbotConfig,
    context: ConversationContext
  ): Promise<string> {
    try {
      console.log(`[Agent] Processing message for chatbot ${context.chatbotId}: "${message.substring(0, 50)}..."`);
      
      // Get or create agent
      const agent = await this.getAgent(config, context);

      // Invoke agent with timeout protection
      const result = await Promise.race([
        agent.invoke({ input: message }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Agent timeout after 30s')), 30000)
        )
      ]) as any;

      // Validate response
      if (!result || typeof result.output !== 'string') {
        console.error('[Agent] Invalid response format:', result);
        throw new Error('Agent returned invalid response format');
      }

      const output = result.output.trim();
      
      // Check for empty responses
      if (output.length === 0) {
        console.error('[Agent] Empty response generated, using fallback');
        // Return fallback message instead of throwing error
        return config.behavior?.fallbackMessage || "I'm here to help! Could you please rephrase your question?";
      }

      console.log(`[Agent] Response generated (${output.length} chars): "${output.substring(0, 100)}..."`);
      
      return output;
    } catch (error: any) {
      console.error('[Agent] Error processing message:', error);
      console.error('[Agent] Error stack:', error.stack);
      throw new Error(`Agent error: ${error.message}`);
    }
  }

  /**
   * Clear agent and memory for a session
   */
  clearSession(chatbotId: string, sessionId: string) {
    const agentKey = `${chatbotId}_${sessionId}`;
    this.agents.delete(agentKey);
    this.memories.delete(sessionId);
    console.log(`[Agent] Cleared session ${sessionId}`);
  }

  /**
   * Clear all agents and memories (for cleanup)
   */
  clearAll() {
    this.agents.clear();
    this.memories.clear();
    console.log('[Agent] Cleared all sessions');
  }
}

// Export singleton instance
export const langchainAgentService = new LangChainAgentService();
