# Install LangChain Dependencies

## Required Packages

Run this command to install all required LangChain packages:

```bash
npm install langchain @langchain/openai @langchain/core
```

## Package Details

- **`langchain`** - Main LangChain library with agents, memory, and tools
- **`@langchain/openai`** - OpenAI integration for LangChain
- **`@langchain/core`** - Core LangChain types and utilities

## Already Installed

- ✅ `@langchain/textsplitters` - Already in your package.json

## After Installation

1. Restart your development server
2. The new LangChain agent will be used automatically
3. Test the chatbot with questions related to your knowledge base documents

## What's New

### LangChain Agent Architecture

The chatbot now uses a sophisticated LangChain agent that:

1. **Knowledge Base Retrieval Tool**
   - Automatically searches vector database when needed
   - Uses semantic similarity to find relevant information
   - Injects context into the conversation

2. **MCP Tools Integration**
   - `book_appointment` - Schedule appointments
   - `capture_lead` - Save customer contact information
   - Tools are dynamically created based on chatbot configuration

3. **Conversation Memory**
   - Maintains context across messages in a session
   - Uses BufferMemory to remember previous interactions
   - Each session has its own isolated memory

4. **Intelligent Tool Selection**
   - Agent decides when to use which tool
   - Can chain multiple tools together
   - Provides reasoning about tool usage

### How It Works

```
User Message
    ↓
LangChain Agent
    ├→ Analyzes message intent
    ├→ Decides which tools to use
    ├→ [Tool: search_knowledge_base] → Vector DB → Relevant chunks
    ├→ [Tool: book_appointment] → MCP Service → Appointment created
    ├→ [Tool: capture_lead] → Database → Lead saved
    ├→ Combines tool results with conversation memory
    └→ Generates intelligent response
    ↓
Response to User
```

### Example Conversation

**User:** "What's your refund policy?"
- Agent uses `search_knowledge_base` tool
- Finds relevant policy documents
- Responds with accurate information

**User:** "I'd like to schedule a consultation"
- Agent uses `book_appointment` tool
- Asks for required details
- Books the appointment
- Confirms with user

**User:** "My email is john@example.com"
- Agent uses `capture_lead` tool
- Saves contact information
- Thanks the user

All while maintaining conversation context!

## Verification

After installation, check the server logs for:

```
[Agent] Creating new agent for chatbot [id]
[Agent] Created 3 tools: search_knowledge_base, book_appointment, capture_lead
[KB Tool] Searching knowledge base for: "..."
[KB Tool] Found 5 relevant chunks
[Agent] Response generated
```

## Troubleshooting

### Module not found errors
- Run `npm install` to ensure all packages are installed
- Restart your development server

### Agent errors
- Check that OPENAI_API_KEY is set
- Verify the database migration was run (for vector search)
- Check server logs for detailed error messages

### Memory issues
- Memory is session-based and cleared when session ends
- Use `langchainAgentService.clearSession()` to manually clear
- Memory is stored in-memory (not persisted to database)
