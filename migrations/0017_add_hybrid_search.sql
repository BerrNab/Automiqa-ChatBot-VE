-- Migration: Add Hybrid Search (Vector + Full-Text Search)
-- This migration adds a GIN index for keyword search and a function to combine results

-- 1. Create a GIN index for full-text search on the 'text' column
CREATE INDEX IF NOT EXISTS kb_chunks_text_ts_idx ON kb_chunks USING GIN (to_tsvector('simple', text));

-- 2. Create the hybrid_match_documents function
-- This uses Reciprocal Rank Fusion (RRF) to combine vector similarity and keyword search
CREATE OR REPLACE FUNCTION hybrid_match_documents (
  query_embedding vector(1536),
  query_text text,
  match_threshold float,
  match_count int,
  p_chatbot_id varchar,
  k int DEFAULT 60
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
  -- We use a CTE to combine vector search and full-text search results
  RETURN QUERY
  WITH vector_matches AS (
    SELECT 
      c.id,
      1 - (c.embedding <=> query_embedding) as similarity,
      row_number() OVER (ORDER BY c.embedding <=> query_embedding) as rank
    FROM kb_chunks c
    JOIN kb_documents d ON c.document_id = d.id
    WHERE 
      c.chatbot_id = p_chatbot_id
      AND c.embedding IS NOT NULL
      AND d.status = 'ready'
      AND 1 - (c.embedding <=> query_embedding) >= match_threshold
    LIMIT match_count * 2 -- Get more candidates for fusion
  ),
  text_matches AS (
    SELECT 
      c.id,
      ts_rank_cd(to_tsvector('simple', c.text), plainto_tsquery('simple', query_text)) as rank_score,
      row_number() OVER (ORDER BY ts_rank_cd(to_tsvector('simple', c.text), plainto_tsquery('simple', query_text)) DESC) as rank
    FROM kb_chunks c
    JOIN kb_documents d ON c.document_id = d.id
    WHERE 
      c.chatbot_id = p_chatbot_id
      AND d.status = 'ready'
      AND to_tsvector('simple', c.text) @@ plainto_tsquery('simple', query_text)
    LIMIT match_count * 2
  )
  SELECT 
    c.text,
    COALESCE(v.similarity, 0.0)::float as similarity,
    d.filename,
    CASE 
      WHEN c.metadata IS NULL OR c.metadata = '' THEN '{}'::jsonb
      ELSE c.metadata::jsonb
    END as metadata
  FROM kb_chunks c
  JOIN kb_documents d ON c.document_id = d.id
  LEFT JOIN vector_matches v ON c.id = v.id
  LEFT JOIN text_matches t ON c.id = t.id
  WHERE (v.id IS NOT NULL OR t.id IS NOT NULL)
  ORDER BY 
    (COALESCE(1.0 / (k + v.rank), 0.0) + COALESCE(1.0 / (k + t.rank), 0.0)) DESC
  LIMIT match_count;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION hybrid_match_documents IS 'Performs hybrid search by combining vector similarity search (cosine distance) and keyword-based full-text search using Reciprocal Rank Fusion (RRF).';
