-- Migration: Add embedding configuration to chatbot config
-- This migration updates the chatbot config schema to support:
-- 1. Selectable embedding models (text-embedding-3-large, text-embedding-3-small, text-embedding-ada-002)
-- 2. Configurable embedding dimensions
-- 3. File-type-specific chunking strategies for JSON, CSV, Excel, PDF, and Text files

-- Note: The config is stored as JSONB, so we just need to ensure existing chatbots
-- get sensible defaults when the new fields are accessed.

-- Update existing chatbots to have default embedding configuration
-- This uses jsonb_set to add the new fields without overwriting existing config

-- Add embeddingModel default
UPDATE chatbots
SET config = jsonb_set(
  config::jsonb,
  '{knowledgeBase,embeddingModel}',
  '"text-embedding-3-large"'::jsonb,
  true
)::text
WHERE config::jsonb->'knowledgeBase' IS NOT NULL
  AND config::jsonb->'knowledgeBase'->>'embeddingModel' IS NULL;

-- Add embeddingDimensions default
UPDATE chatbots
SET config = jsonb_set(
  config::jsonb,
  '{knowledgeBase,embeddingDimensions}',
  '1536'::jsonb,
  true
)::text
WHERE config::jsonb->'knowledgeBase' IS NOT NULL
  AND config::jsonb->'knowledgeBase'->>'embeddingDimensions' IS NULL;

-- Add chunkingStrategy defaults
UPDATE chatbots
SET config = jsonb_set(
  config::jsonb,
  '{knowledgeBase,chunkingStrategy}',
  '{
    "json": {"preserveStructure": true, "maxDepth": 3, "chunkSize": 500, "includeKeys": true},
    "csv": {"rowsPerChunk": 10, "includeHeaders": true, "columnSeparator": ", "},
    "excel": {"rowsPerChunk": 10, "includeHeaders": true, "includeSheetName": true},
    "pdf": {"chunkSize": 1000, "overlap": 200, "preserveParagraphs": true},
    "text": {"chunkSize": 1000, "overlap": 200, "respectSentences": true}
  }'::jsonb,
  true
)::text
WHERE config::jsonb->'knowledgeBase' IS NOT NULL
  AND config::jsonb->'knowledgeBase'->>'chunkingStrategy' IS NULL;

-- For chatbots without knowledgeBase config, add the full default
UPDATE chatbots
SET config = jsonb_set(
  config::jsonb,
  '{knowledgeBase}',
  '{
    "autoLearn": false,
    "updateFrequency": "manual",
    "embeddingModel": "text-embedding-3-large",
    "embeddingDimensions": 1536,
    "chunkingStrategy": {
      "json": {"preserveStructure": true, "maxDepth": 3, "chunkSize": 500, "includeKeys": true},
      "csv": {"rowsPerChunk": 10, "includeHeaders": true, "columnSeparator": ", "},
      "excel": {"rowsPerChunk": 10, "includeHeaders": true, "includeSheetName": true},
      "pdf": {"chunkSize": 1000, "overlap": 200, "preserveParagraphs": true},
      "text": {"chunkSize": 1000, "overlap": 200, "respectSentences": true}
    }
  }'::jsonb,
  true
)::text
WHERE config::jsonb->'knowledgeBase' IS NULL;

-- Add metadata column to kb_chunks if it doesn't have the embedding model info
-- This helps track which model was used for each chunk
COMMENT ON COLUMN kb_chunks.metadata IS 'Stores chunk metadata including: filename, contentType, fileType, embeddingModel, embeddingDimensions, extractedAt, and file-type-specific metadata (e.g., row numbers for CSV, sheet names for Excel)';

-- Create an index on metadata for faster queries by embedding model (optional, for analytics)
CREATE INDEX IF NOT EXISTS idx_kb_chunks_embedding_model 
ON kb_chunks ((metadata::jsonb->>'embeddingModel'));

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 0015: Added embedding configuration to chatbot config';
  RAISE NOTICE 'Supported embedding models: text-embedding-3-large, text-embedding-3-small, text-embedding-ada-002';
  RAISE NOTICE 'Supported file types: PDF, Word, Text, JSON, CSV, Excel';
END $$;
