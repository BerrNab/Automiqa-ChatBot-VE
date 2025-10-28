-- Create the match_documents function for vector similarity search
-- This function is used by the knowledge base to find relevant document chunks

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
    AND 1 - (c.embedding <=> query_embedding) >= match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add a comment explaining the function
COMMENT ON FUNCTION match_documents IS 'Searches for similar document chunks using vector similarity (cosine distance). Returns chunks that exceed the similarity threshold, ordered by relevance.';
