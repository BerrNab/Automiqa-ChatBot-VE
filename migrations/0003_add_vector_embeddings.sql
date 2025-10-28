-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to kb_chunks table
-- Using vector(1536) for OpenAI's text-embedding-3-large which produces 1536-dimensional vectors
ALTER TABLE kb_chunks 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for vector similarity search using cosine distance
-- This significantly speeds up similarity searches
CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx 
ON kb_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Note: The ivfflat index requires some data to be present before it can be built efficiently
-- If you get an error about not enough data, you can create the index after uploading some documents
-- Or use this simpler index instead:
-- CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx ON kb_chunks USING hnsw (embedding vector_cosine_ops);
