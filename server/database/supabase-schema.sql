-- Supabase Schema Creation Script for Knowledge Base
-- This script creates the necessary tables for the knowledge base functionality
-- Run this script in your Supabase SQL editor

-- Enable the pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base documents table
-- Stores metadata about uploaded documents
CREATE TABLE IF NOT EXISTS kb_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chatbot_id VARCHAR NOT NULL, -- References chatbots.id from main database
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    storage_path TEXT NOT NULL, -- Path in Supabase storage bucket
    status TEXT NOT NULL DEFAULT 'uploaded', -- uploaded|processing|ready|error
    checksum TEXT NOT NULL, -- SHA256 hash for duplicate detection
    version INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for kb_documents
CREATE INDEX IF NOT EXISTS kb_documents_chatbot_id_idx ON kb_documents (chatbot_id);
CREATE INDEX IF NOT EXISTS kb_documents_status_idx ON kb_documents (status);
CREATE INDEX IF NOT EXISTS kb_documents_checksum_idx ON kb_documents (checksum);

-- Unique constraint: same file (checksum) can't be uploaded twice for same chatbot
CREATE UNIQUE INDEX IF NOT EXISTS kb_documents_checksum_unique_idx ON kb_documents (chatbot_id, checksum);

-- Knowledge base chunks table with vector embeddings
-- Stores text chunks from documents with their vector embeddings for similarity search
CREATE TABLE IF NOT EXISTS kb_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
    chatbot_id VARCHAR NOT NULL, -- References chatbots.id from main database
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    token_count INTEGER NOT NULL,
    embedding VECTOR(1536), -- OpenAI embeddings are 1536 dimensions
    metadata JSONB DEFAULT '{}', -- Additional chunk metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for kb_chunks
CREATE INDEX IF NOT EXISTS kb_chunks_document_id_idx ON kb_chunks (document_id);
CREATE INDEX IF NOT EXISTS kb_chunks_chatbot_id_idx ON kb_chunks (chatbot_id);
CREATE INDEX IF NOT EXISTS kb_chunks_chunk_index_idx ON kb_chunks (chunk_index);

-- Create vector similarity search index using ivfflat
-- This enables fast similarity search queries using cosine distance
CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx ON kb_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Optional: Create a view for easy querying with document metadata
CREATE OR REPLACE VIEW kb_chunks_with_documents AS
SELECT 
    c.id,
    c.document_id,
    c.chatbot_id,
    c.chunk_index,
    c.text,
    c.token_count,
    c.embedding,
    c.metadata,
    c.created_at,
    d.filename,
    d.content_type,
    d.storage_path,
    d.status as document_status
FROM kb_chunks c
JOIN kb_documents d ON c.document_id = d.id;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at for kb_documents
CREATE OR REPLACE TRIGGER update_kb_documents_updated_at 
    BEFORE UPDATE ON kb_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket setup (run this separately if needed)
-- This creates a bucket for storing the actual document files
/*
-- Create storage bucket for knowledge base documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'knowledge-base-docs', 
    'knowledge-base-docs', 
    false, 
    50000000, -- 50MB limit
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/json', 'text/plain']
);

-- Set up RLS (Row Level Security) policies for the storage bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'knowledge-base-docs' AND auth.role() = 'authenticated');

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads" ON storage.objects
FOR SELECT USING (bucket_id = 'knowledge-base-docs' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'knowledge-base-docs' AND auth.role() = 'authenticated');
*/

-- Sample query for vector similarity search
-- This is how you would search for similar content in your application
/*
SELECT 
    c.text,
    c.metadata,
    d.filename,
    1 - (c.embedding <=> '[your_query_embedding_vector]') as similarity
FROM kb_chunks c
JOIN kb_documents d ON c.document_id = d.id
WHERE c.chatbot_id = 'your_chatbot_id'
ORDER BY c.embedding <=> '[your_query_embedding_vector]'
LIMIT 5;
*/