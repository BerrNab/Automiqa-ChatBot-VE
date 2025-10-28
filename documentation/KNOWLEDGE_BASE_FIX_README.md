# Knowledge Base Fix - "My apologies..." Issue

## Problem Summary

The chatbot was responding with "My apologies..." to most messages because the knowledge base vector search was **silently failing**. 

### Root Cause

The `match_documents` PostgreSQL function was missing from the database. The code was calling:

```typescript
await supabase.rpc('match_documents', {...})
```

But this function was never created in any migration. When the RPC call failed, it returned an empty array, causing the AI to have no context and respond with generic apology messages.

## The Fix

Created a new migration file: `migrations/0004_add_match_documents_function.sql`

This migration adds the missing PostgreSQL function that performs vector similarity search using pgvector's cosine distance operator.

## How to Apply the Fix

### Option 1: Supabase Dashboard (Recommended)

1. Open your Supabase project
2. Go to **SQL Editor**
3. Copy and paste the contents of `migrations/0004_add_match_documents_function.sql`
4. Click **Run**

### Option 2: Command Line

```bash
psql "your-supabase-connection-string" -f migrations/0004_add_match_documents_function.sql
```

### Option 3: Direct SQL

Run this SQL in your Supabase SQL Editor:

```sql
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

## Verification

After running the migration, verify the function exists:

```sql
-- Check if function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'match_documents';
```

You should see one row returned with `match_documents`.

## Testing

1. **Upload a test document** to your chatbot's knowledge base
2. **Wait for processing** - Status should change to "Ready"
3. **Ask a question** related to the document content
4. **Check server logs** - You should see:
   ```
   [KB Tool] Searching knowledge base for: "your question"
   [KB Tool] Found X relevant chunks
   ```

## What This Function Does

The `match_documents` function:

1. Takes a query embedding (vector) as input
2. Searches the `kb_chunks` table for similar embeddings using cosine distance
3. Joins with `kb_documents` to get document metadata
4. Filters by:
   - Chatbot ID (only searches that chatbot's documents)
   - Embedding exists (not NULL)
   - Document status is "ready"
   - Similarity exceeds threshold (default 0.7 = 70%)
5. Returns the most similar chunks ordered by relevance

## Prerequisites

Before this fix works, you must have already run:

1. `migrations/0003_add_vector_embeddings.sql` - Adds the `embedding` column and pgvector extension

If you haven't run that migration yet, run it first!

## Expected Behavior After Fix

- ✅ Knowledge base searches work correctly
- ✅ AI uses document context to answer questions
- ✅ No more generic "My apologies..." responses for knowledge-based questions
- ✅ Server logs show successful knowledge base searches
- ✅ Relevant document chunks appear in AI responses

## Troubleshooting

### Still getting "My apologies..." responses?

1. **Check if documents are uploaded and processed:**
   ```sql
   SELECT id, filename, status FROM kb_documents WHERE chatbot_id = 'your-chatbot-id';
   ```
   Status should be "ready"

2. **Check if embeddings were created:**
   ```sql
   SELECT COUNT(*) FROM kb_chunks WHERE chatbot_id = 'your-chatbot-id' AND embedding IS NOT NULL;
   ```
   Should return > 0

3. **Test the function directly:**
   ```sql
   -- Replace with an actual embedding vector from your kb_chunks table
   SELECT * FROM match_documents(
     (SELECT embedding FROM kb_chunks LIMIT 1),
     0.5,
     5,
     'your-chatbot-id'
   );
   ```

4. **Check server logs** for errors when processing messages

### Function exists but returns no results?

- Lower the `match_threshold` in the code (currently 0.7)
- Verify documents have status "ready"
- Check that embeddings were generated correctly

## Technical Details

**Function Signature:**
- `query_embedding`: vector(1536) - The embedding of the user's question
- `match_threshold`: float - Minimum similarity score (0.0 to 1.0)
- `match_count`: int - Maximum number of results to return
- `p_chatbot_id`: varchar - The chatbot ID to filter by

**Returns:**
- `text`: The chunk text content
- `similarity`: Similarity score (0.0 to 1.0, higher is better)
- `filename`: Source document filename
- `metadata`: Additional chunk metadata (JSON)

**Distance Metric:**
- Uses cosine distance (`<=>` operator)
- Similarity = 1 - distance (so higher is more similar)
- Threshold of 0.7 means 70% similarity or higher

## Related Files

- `server/storage-supabase.ts` - Calls the `match_documents` function
- `server/services/openai.ts` - Uses search results to enhance AI context
- `server/services/langchain-agent.ts` - LangChain agent with KB tool
- `server/application/knowledgeBaseService.ts` - Document upload and processing

## Migration History

1. `0000_initial_schema.sql` - Initial database schema
2. `0001_ensure_valid_chatbot_config.sql` - Config validation
3. `0002_add_appearance_colors.sql` - UI customization
4. `0003_add_vector_embeddings.sql` - pgvector support
5. **`0004_add_match_documents_function.sql`** - This fix (NEW!)
