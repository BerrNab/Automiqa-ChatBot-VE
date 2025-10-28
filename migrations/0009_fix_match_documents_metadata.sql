-- Fix match_documents function to properly handle metadata column
-- The kb_chunks.metadata column might be TEXT in some databases, so we cast it to JSONB

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
    CASE 
      WHEN c.metadata IS NULL OR c.metadata = '' THEN '{}'::jsonb
      ELSE c.metadata::jsonb
    END as metadata
  FROM kb_chunks c
  JOIN kb_documents d ON c.document_id = d.id
  WHERE 
    c.chatbot_id = p_chatbot_id
    AND c.embedding IS NOT NULL
    AND d.status = 'ready'
    AND 1 - (c.embedding <=> query_embedding) >= match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION match_documents IS 'Searches for similar document chunks using vector similarity (cosine distance). Returns chunks that meet or exceed the similarity threshold, ordered by relevance. Handles metadata as both TEXT and JSONB types.';
