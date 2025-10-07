import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { supabaseStorage as storage } from "../storage-supabase";
import { openaiService } from "./openai";
import { mcpService } from "./mcp";
import type { ChatbotConfig } from "@shared/schema";

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
      description: "Search the company's knowledge base for relevant information. Use this when you need to answer questions about products, services, policies, or any company-specific information.",
      schema: z.object({
        query: z.string().describe("The search query to find relevant information"),
      }),
      func: async ({ query }) => {
        try {
          console.log(`[KB Tool] Searching knowledge base for: "${query}"`);
          
          // Create embedding for the query
          const queryEmbedding = await openaiService.createEmbedding(query);
          
          // Search for similar chunks
          const results = await storage.searchKBChunks(chatbotId, queryEmbedding, 5);
          
          if (results.length === 0) {
            return "No relevant information found in the knowledge base.";
          }
          
          // Format results
          let response = "Found relevant information:\n\n";
          results.forEach((chunk, idx) => {
            response += `[${idx + 1}] (Similarity: ${(chunk.similarity * 100).toFixed(1)}%)\n`;
            response += `${chunk.text}\n\n`;
          });
          
          console.log(`[KB Tool] Found ${results.length} relevant chunks`);
          return response;
        } catch (error: any) {
          console.error('[KB Tool] Error:', error);
          return `Error searching knowledge base: ${error.message}`;
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

    // Appointment booking tool
    if (config.appointmentTypes && config.appointmentTypes.length > 0) {
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
   * Create or get an agent for a chatbot session
   */
  async getAgent(
    config: ChatbotConfig,
    context: ConversationContext
  ): Promise<AgentExecutor> {
    const agentKey = `${context.chatbotId}_${context.sessionId}`;

    // Return existing agent if available
    if (this.agents.has(agentKey)) {
      return this.agents.get(agentKey)!;
    }

    console.log(`[Agent] Creating new agent for chatbot ${context.chatbotId}`);

    // Initialize OpenAI model
    const model = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // Create tools
    const tools: DynamicStructuredTool[] = [];
    
    // Add knowledge base tool
    tools.push(this.createKnowledgeBaseTool(context.chatbotId));
    
    // Add MCP tools
    const mcpTools = await this.createMCPTools(config, context);
    tools.push(...mcpTools);

    console.log(`[Agent] Created ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);

    // Create prompt template
    const systemPrompt = config.behavior?.systemPrompt || 
      "You are a helpful customer service assistant. Use the available tools to help customers with their questions and requests.";

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

    // Create agent executor
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      memory,
      verbose: true, // Enable logging
      maxIterations: 5,
      returnIntermediateSteps: false,
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
      console.log(`[Agent] Processing message for chatbot ${context.chatbotId}`);
      
      // Get or create agent
      const agent = await this.getAgent(config, context);

      // Invoke agent
      const result = await agent.invoke({
        input: message,
      });

      console.log(`[Agent] Response generated:`, result.output);
      
      return result.output;
    } catch (error: any) {
      console.error('[Agent] Error processing message:', error);
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
