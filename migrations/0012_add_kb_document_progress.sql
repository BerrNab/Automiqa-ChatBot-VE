-- Add progress tracking columns to kb_documents table
ALTER TABLE kb_documents 
ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processed_chunks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_chunks INTEGER DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN kb_documents.processing_progress IS 'Processing progress percentage (0-100)';
COMMENT ON COLUMN kb_documents.processed_chunks IS 'Number of chunks processed so far';
COMMENT ON COLUMN kb_documents.total_chunks IS 'Total number of chunks to process';
