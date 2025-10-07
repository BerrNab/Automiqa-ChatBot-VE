# Knowledge Base Feature Guide

## Overview
The Knowledge Base feature allows you to upload documents that will be processed and used to enhance your chatbot's responses through RAG (Retrieval-Augmented Generation).

## How to Use

### 1. Access the Knowledge Base Tab
- Navigate to the chatbot edit page
- Click on the **"Knowledge Base"** tab (between "Behavior" and "Lead Capture")
- **Note**: You must save the chatbot first before uploading documents

### 2. Upload Documents
- Click "Browse Files" or drag and drop files into the upload area
- Supported formats: PDF, DOC, DOCX, TXT, JSON
- Maximum file size: 10MB per file
- Multiple files can be uploaded at once

### 3. Document Processing
After upload, documents go through these stages:
1. **Uploaded** - File stored in Supabase Storage
2. **Processing** - Text extraction, chunking, and embedding generation
3. **Ready** - Document is available for chatbot queries
4. **Error** - Processing failed (error message displayed)

The UI automatically refreshes every 5 seconds to show processing status.

### 4. Manage Documents
- View all uploaded documents with their status
- See file size and upload date
- Delete documents using the trash icon

## Technical Details

### Document Processing Pipeline
1. **Text Extraction**: Content extracted based on file type
2. **Chunking**: Text split into 1000-character chunks with 200-character overlap
3. **Embedding Generation**: OpenAI's text-embedding-ada-002 creates vector embeddings
4. **Storage**: Chunks with embeddings stored in PostgreSQL with pgvector

### Duplicate Prevention
- SHA-256 checksum calculated for each file
- Prevents uploading the same document twice to the same chatbot

### Vector Search
- Embeddings enable semantic search across document chunks
- Chatbot can find relevant information even with different wording
- Results ranked by similarity score

## API Endpoints

### Upload Document
```
POST /api/admin/chatbots/:chatbotId/kb/upload
Content-Type: multipart/form-data
Body: { document: File }
```

### List Documents
```
GET /api/admin/chatbots/:chatbotId/kb/documents
```

### Delete Document
```
DELETE /api/admin/chatbots/:chatbotId/kb/documents/:documentId
```

## Database Schema

### kb_documents Table
- `id` - Unique document identifier
- `chatbot_id` - Associated chatbot
- `filename` - Original filename
- `content_type` - MIME type
- `size` - File size in bytes
- `storage_path` - Path in Supabase Storage
- `checksum` - SHA-256 hash for duplicate detection
- `status` - Processing status
- `error_message` - Error details if processing failed

### kb_chunks Table
- `id` - Unique chunk identifier
- `document_id` - Parent document
- `chatbot_id` - Associated chatbot
- `chunk_index` - Position in document
- `text` - Chunk content
- `token_count` - Number of tokens
- `embedding` - Vector embedding (pgvector)
- `metadata` - Additional information

## Environment Variables Required

```env
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Troubleshooting

### Document stuck in "Processing"
- Check server logs for errors
- Verify OpenAI API key is configured
- Ensure Supabase Storage is accessible

### Upload fails
- Verify file type is supported
- Check file size is under 10MB
- Ensure user has admin authentication

### Embeddings not working
- Confirm OPENAI_API_KEY is set
- Check OpenAI API quota/billing
- Review server logs for API errors

## Best Practices

1. **Document Quality**: Upload well-formatted documents for better extraction
2. **File Size**: Keep files under 5MB for faster processing
3. **Organization**: Use descriptive filenames
4. **Updates**: Delete old versions before uploading updated documents
5. **Testing**: Test chatbot responses after uploading to verify knowledge integration

## Future Enhancements

Potential improvements:
- Support for more file formats (Excel, PowerPoint)
- Custom chunk size configuration
- Document versioning
- Bulk upload/delete operations
- Search and filter documents
- Preview document content
- Re-process failed documents
- Analytics on document usage
