# LangChain Agent Architecture

## 🎯 Overview

Your chatbot now uses a **LangChain Agent** with:
- ✅ Vector store retrieval from knowledge base
- ✅ MCP tools for appointments and lead capture
- ✅ Conversation memory per session
- ✅ Intelligent tool selection and chaining

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User sends message                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              LangChain Agent (GPT-4)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  System Prompt + Chat History + Current Message     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Agent analyzes and decides which tools to use:             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Tool 1: search_knowledge_base                        │  │
│  │  ├─ Creates embedding for user query                 │  │
│  │  ├─ Searches vector database (cosine similarity)     │  │
│  │  ├─ Returns top 5 relevant chunks                    │  │
│  │  └─ Provides context to agent                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Tool 2: book_appointment                             │  │
│  │  ├─ Extracts appointment details from conversation   │  │
│  │  ├─ Validates required fields                        │  │
│  │  ├─ Creates appointment via MCP service              │  │
│  │  └─ Returns confirmation                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Tool 3: capture_lead                                 │  │
│  │  ├─ Extracts contact information                     │  │
│  │  ├─ Saves to database                                │  │
│  │  └─ Returns success message                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ BufferMemory                                         │  │
│  │  ├─ Stores conversation history                      │  │
│  │  ├─ Maintains context across messages                │  │
│  │  └─ Session-specific (isolated per user)             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Agent combines tool results + memory + reasoning           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          Intelligent, context-aware response                 │
└─────────────────────────────────────────────────────────────┘
```

## 📁 File Structure

```
server/
├── services/
│   ├── langchain-agent.ts      ← NEW! Main agent service
│   ├── openai.ts               ← Embedding generation
│   ├── mcp.ts                  ← MCP tools backend
│   └── knowledge-base.ts       ← Document processing
├── application/
│   └── widgetService.ts        ← Updated to use agent
└── storage-supabase.ts         ← Vector search queries
```

## 🔧 Key Components

### 1. LangChainAgentService (`langchain-agent.ts`)

**Main class that manages agents:**

```typescript
class LangChainAgentService {
  // Cached agents per session
  private agents: Map<string, AgentExecutor>
  
  // Conversation memory per session
  private memories: Map<string, BufferMemory>
  
  // Create knowledge base search tool
  createKnowledgeBaseTool(chatbotId)
  
  // Create MCP tools (appointments, leads)
  createMCPTools(config, context)
  
  // Get or create agent for session
  getAgent(config, context)
  
  // Process message through agent
  processMessage(message, config, context)
}
```

### 2. Tools

#### Knowledge Base Tool
```typescript
{
  name: "search_knowledge_base",
  description: "Search company knowledge base for information",
  schema: { query: string },
  func: async ({ query }) => {
    // 1. Create embedding
    // 2. Search vector DB
    // 3. Return relevant chunks
  }
}
```

#### Appointment Booking Tool
```typescript
{
  name: "book_appointment",
  description: "Book an appointment for the customer",
  schema: {
    appointmentType: string,
    customerName: string,
    customerEmail: string,
    preferredDate: string,
    preferredTime: string,
    notes?: string
  },
  func: async (input) => {
    // Use MCP service to book
  }
}
```

#### Lead Capture Tool
```typescript
{
  name: "capture_lead",
  description: "Capture customer contact information",
  schema: {
    name?: string,
    email?: string,
    phone?: string,
    message?: string
  },
  func: async (input) => {
    // Save to database
  }
}
```

### 3. Memory System

**BufferMemory** maintains conversation context:
- Stores all messages in the session
- Automatically included in agent prompts
- Isolated per session (no cross-contamination)
- Cleared when session ends

### 4. Agent Executor

**OpenAI Functions Agent:**
- Uses GPT-4 model
- Function calling for tool selection
- Max 5 iterations to prevent loops
- Verbose logging for debugging

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```bash
npm install langchain @langchain/openai @langchain/core
```

### Step 2: Run Database Migration

**CRITICAL:** The vector search won't work without this!

```sql
-- In Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE kb_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536);
CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx 
ON kb_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Step 3: Restart Server

```bash
# Stop current server
# Start again
npm run dev
```

### Step 4: Test

1. Upload a document to knowledge base
2. Wait for "Ready" status
3. Ask questions related to the document
4. Try booking an appointment
5. Provide contact information

## 📊 Example Conversation Flow

### Scenario: Customer asks about refund policy

```
User: "What's your refund policy?"

[Agent] Analyzing message...
[Agent] Deciding to use: search_knowledge_base
[KB Tool] Searching knowledge base for: "refund policy"
[KB Tool] Found 3 relevant chunks
[Agent] Generating response with context...

Bot: "According to our policy, we offer full refunds within 30 days 
      of purchase. To request a refund, please contact our support 
      team at support@company.com with your order number."
```

### Scenario: Customer wants to book appointment

```
User: "I'd like to schedule a consultation"

[Agent] Analyzing message...
[Agent] Deciding to use: book_appointment
[Agent] Need more information...

Bot: "I'd be happy to help you schedule a consultation! 
      Could you please provide:
      - Your full name
      - Your email address
      - Preferred date and time"

User: "John Doe, john@example.com, tomorrow at 2pm"

[Agent] Extracting information...
[Agent] Using tool: book_appointment
[MCP Tool] Booking appointment...
[MCP Tool] Success!

Bot: "Perfect! I've scheduled your consultation for tomorrow at 2:00 PM. 
      You'll receive a confirmation email at john@example.com shortly."
```

### Scenario: Multi-turn with memory

```
User: "What services do you offer?"

[Agent] Using: search_knowledge_base
Bot: "We offer web development, mobile apps, and consulting services."

User: "How much does web development cost?"

[Agent] Using: search_knowledge_base
[Agent] Remembers context: user asked about services, now asking about pricing
Bot: "Our web development packages start at $5,000 for basic sites..."

User: "I'm interested. Can we schedule a call?"

[Agent] Using: book_appointment
[Agent] Remembers: user interested in web development
Bot: "Great! I'd love to discuss our web development services with you..."
```

## 🎯 Benefits

### 1. **Intelligent Context Awareness**
- Agent remembers previous messages
- Understands conversation flow
- Provides relevant follow-up responses

### 2. **Automatic Tool Selection**
- Agent decides when to search knowledge base
- Knows when to book appointments
- Captures leads at appropriate times

### 3. **Multi-Step Reasoning**
- Can chain multiple tools
- Handles complex queries
- Breaks down tasks automatically

### 4. **Scalable Architecture**
- Easy to add new tools
- Modular design
- Session isolation

## 🔍 Monitoring & Debugging

### Server Logs

Look for these log messages:

```
[Agent] Creating new agent for chatbot abc123
[Agent] Created 3 tools: search_knowledge_base, book_appointment, capture_lead
[Widget] Processing message with LangChain agent for chatbot abc123
[KB Tool] Searching knowledge base for: "..."
[KB Tool] Found 5 relevant chunks
[MCP Tool] Booking appointment: {...}
[Agent] Response generated: ...
```

### Database Queries

Check vector search is working:

```sql
-- Check embeddings exist
SELECT COUNT(*) FROM kb_chunks WHERE embedding IS NOT NULL;

-- Test similarity search
SELECT text, embedding <=> '[0.1, 0.2, ...]'::vector as distance
FROM kb_chunks
WHERE chatbot_id = 'your-id'
ORDER BY distance
LIMIT 5;
```

## 🐛 Troubleshooting

### Agent not using knowledge base
- ✅ Check migration was run
- ✅ Verify documents are uploaded and "Ready"
- ✅ Check embeddings exist in database
- ✅ Look for `[KB Tool]` logs

### Tools not working
- ✅ Check MCP tools are enabled in config
- ✅ Verify appointment types are configured
- ✅ Check lead capture is enabled

### Memory not persisting
- ✅ Memory is session-based (same sessionId required)
- ✅ Memory cleared when session ends
- ✅ Check sessionId is being passed correctly

### Performance issues
- ✅ Agent cached per session (fast subsequent calls)
- ✅ Vector search indexed (fast similarity search)
- ✅ Max 5 iterations prevents infinite loops

## 🎉 Summary

You now have a **production-ready LangChain agent** that:
- ✅ Searches your knowledge base intelligently
- ✅ Books appointments automatically
- ✅ Captures leads seamlessly
- ✅ Maintains conversation context
- ✅ Makes intelligent decisions about tool usage
- ✅ Provides accurate, context-aware responses

This is exactly the architecture you envisioned! 🚀
