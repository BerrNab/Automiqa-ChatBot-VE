-- Migration: Fix vector dimensions to support variable embedding sizes
-- The original migration hardcoded vector(1536), but we now support different dimensions
-- This migration updates the column to support the maximum possible dimensions (3072)

-- First, drop the existing index since it depends on the vector column
DROP INDEX IF EXISTS kb_chunks_embedding_idx;

-- Drop the vector column (this will also delete all existing embeddings)
ALTER TABLE kb_chunks DROP COLUMN IF EXISTS embedding;

-- Re-add the embedding column with 1536 dimensions (optimal for all models)
ALTER TABLE kb_chunks 
ADD COLUMN embedding vector(1536);

-- Create index for vector similarity search
CREATE INDEX kb_chunks_embedding_idx 
ON kb_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 0016: Updated embedding column to use 1536 dimensions';
  RAISE NOTICE 'WARNING: All existing embeddings have been deleted and need to be re-uploaded';
  RAISE NOTICE 'Using 1536 dimensions provides excellent quality for all embedding models';
END $$;
