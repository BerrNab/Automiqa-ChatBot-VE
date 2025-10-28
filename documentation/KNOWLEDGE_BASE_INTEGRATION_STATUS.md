# Knowledge Base Integration Status

## ✅ What's Working

### Backend Infrastructure
- ✅ Document upload endpoint (`POST /api/admin/chatbots/:chatbotId/kb/upload`)
- ✅ Document listing endpoint (`GET /api/admin/chatbots/:chatbotId/kb/documents`)
- ✅ Document deletion endpoint (`DELETE /api/admin/chatbots/:chatbotId/kb/documents/:documentId`)
- ✅ Text extraction (PDF, DOC, DOCX, TXT, JSON)
- ✅ Document chunking (1000 chars with 200 char overlap)
- ✅ Embedding generation (OpenAI text-embedding-ada-002)
- ✅ Chunk storage in database

### Frontend
- ✅ Knowledge Base tab in chatbot form
- ✅ Document upload UI with drag & drop
- ✅ Document list with status indicators
- ✅ Delete functionality
- ✅ Auto-refresh for processing status

### AI Integration
- ✅ Vector similarity search implemented (`searchSimilarChunks`)
- ✅ Knowledge base context injection into AI prompts
- ✅ **FIXED**: `chatbotId` now passed to `processMessage` function

## ⚠️ Critical Issue - Database Migrations Required

### The Problem
The knowledge base **will not work** until you run the database migrations because:

1. The `kb_chunks` table is missing the `embedding` column
2. The `pgvector` extension is not enabled
3. **The `match_documents` function is missing** (causes "My apologies..." responses)
4. Without these, the vector similarity search will fail silently

### The Solution
**You MUST run these migrations in order:**
1. `migrations/0003_add_vector_embeddings.sql` - Adds vector support
2. `migrations/0004_add_match_documents_function.sql` - Adds search function (NEW!)

## 🚀 How to Enable Knowledge Base

### Step 1: Run the Migration

**Option A - Supabase Dashboard (Easiest):**
1. Open your Supabase project
2. Go to **SQL Editor**
3. **First**, run `migrations/0003_add_vector_embeddings.sql`:
   ```sql
   -- Enable pgvector extension for vector similarity search
   CREATE EXTENSION IF NOT EXISTS vector;

   -- Add embedding column to kb_chunks table
   ALTER TABLE kb_chunks 
   ADD COLUMN IF NOT EXISTS embedding vector(1536);

   -- Create index for vector similarity search
   CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx 
   ON kb_chunks 
   USING ivfflat (embedding vector_cosine_ops)
   WITH (lists = 100);
   ```
4. Click **Run**
5. **Then**, run `migrations/0004_add_match_documents_function.sql`:
   ```sql
   -- Create the match_documents function for vector similarity search
   CREATE OR REPLACE FUNCTION match_documents (
     query_embedding vector(1536),
     match_threshold float,
     match_count int,
     p_chatbot_id varchar
   )
   RETURNS TABLE (
     text text,
     similarity float,
     filename text,
     metadata jsonb
   )
   LANGUAGE plpgsql
   AS $$
   BEGIN
     RETURN QUERY
     SELECT 
       c.text,
       1 - (c.embedding <=> query_embedding) as similarity,
       d.filename,
       c.metadata
     FROM kb_chunks c
     JOIN kb_documents d ON c.document_id = d.id
     WHERE 
       c.chatbot_id = p_chatbot_id
       AND c.embedding IS NOT NULL
       AND d.status = 'ready'
       AND 1 - (c.embedding <=> query_embedding) > match_threshold
     ORDER BY c.embedding <=> query_embedding
     LIMIT match_count;
   END;
   $$;
   ```
6. Click **Run**

**Option B - Command Line:**
```bash
psql "your-connection-string" -f migrations/0003_add_vector_embeddings.sql
psql "your-connection-string" -f migrations/0004_add_match_documents_function.sql
```

### Step 2: Restart Your Server
After running the migration, restart your development server to pick up the schema changes.

### Step 3: Test the Knowledge Base

1. **Upload a document:**
   - Go to any chatbot edit page
   - Click the "Knowledge Base" tab
   - Upload a test document (PDF, TXT, etc.)
   - Wait for status to change to "Ready"

2. **Test the chatbot:**
   - Open the widget
   - Ask a question related to the document content
   - The chatbot should now use the knowledge base to answer

## 🔍 How It Works

### When a User Sends a Message:

1. **Message received** → `widgetService.processMessage()`
2. **Knowledge base search** → `openaiService.processMessage()` with `chatbotId`
3. **Vector similarity search:**
   - User's message is converted to embedding
   - Database searches for similar chunks using cosine similarity
   - Top 5 most relevant chunks are retrieved
4. **Context injection:**
   - Relevant chunks are added to the system prompt
   - AI receives: system prompt + knowledge base context + user message
5. **AI generates response** using the knowledge base information

### Example Flow:

**User asks:** "What are your refund policies?"

**System does:**
1. Converts question to embedding: `[0.123, -0.456, 0.789, ...]`
2. Searches `kb_chunks` for similar embeddings
3. Finds relevant chunks from uploaded policy documents
4. Injects into prompt:
   ```
   **Relevant information from knowledge base:**
   [1] Our refund policy allows returns within 30 days...
   [2] To request a refund, please contact support@...
   
   **Instructions:** Use the above information to answer the user's question.
   ```
5. AI responds with accurate, document-based answer

## 📊 Monitoring

### Check if Knowledge Base is Working:

1. **Server logs** - Look for:
   ```
   Searching knowledge base for chatbot: [chatbotId]
   Found [N] relevant chunks
   ```

2. **Database query** - Check if chunks exist:
   ```sql
   SELECT COUNT(*) FROM kb_chunks WHERE chatbot_id = 'your-chatbot-id';
   ```

3. **Test query** - Verify embeddings exist:
   ```sql
   SELECT id, text, embedding IS NOT NULL as has_embedding 
   FROM kb_chunks 
   WHERE chatbot_id = 'your-chatbot-id' 
   LIMIT 5;
   ```

## 🐛 Troubleshooting

### AI responds with "My apologies..." for everything
- **Cause:** `match_documents` function is missing from database
- **Fix:** Run `migrations/0004_add_match_documents_function.sql`
- **How to verify:** Check Supabase SQL Editor for the function or look at server logs for RPC errors

### "Could not find the 'embedding' column"
- **Cause:** Migration not run
- **Fix:** Run `0003_add_vector_embeddings.sql`

### "extension vector does not exist"
- **Cause:** pgvector not installed
- **Fix:** For Supabase, run `CREATE EXTENSION vector;` in SQL Editor

### Chatbot not using knowledge base
- **Cause:** No documents uploaded or documents still processing
- **Fix:** Upload documents and wait for "Ready" status

### "not enough data to build index"
- **Cause:** IVFFlat index needs data
- **Fix:** Upload a few documents first, or use HNSW index instead

### Knowledge base search returns empty results
- **Cause:** Either no documents uploaded, `match_documents` function missing, or embeddings not generated
- **Fix:** 
  1. Verify `match_documents` function exists in database
  2. Check that documents have status "ready" 
  3. Verify embeddings were created: `SELECT COUNT(*) FROM kb_chunks WHERE embedding IS NOT NULL;`

## 📝 Next Steps

1. ✅ **Run the migration** (most important!)
2. ✅ Upload test documents
3. ✅ Test with questions related to document content
4. ✅ Monitor server logs for knowledge base searches
5. Consider adding conversation history to improve context

## 🎯 Expected Behavior After Migration

- ✅ Documents upload and process successfully
- ✅ Chunks stored with embeddings
- ✅ Chatbot searches knowledge base for every message
- ✅ Relevant information injected into AI context
- ✅ Accurate, document-based responses
