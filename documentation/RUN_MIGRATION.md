# Run Vector Embeddings Migration

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `migrations/0003_add_vector_embeddings.sql`
4. Paste and run the SQL

## Option 2: Using psql Command Line

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f migrations/0003_add_vector_embeddings.sql
```

## Option 3: Using Supabase CLI

```bash
supabase db push
```

## What This Migration Does

1. **Enables pgvector extension** - Required for vector similarity search
2. **Adds embedding column** - Stores 1536-dimensional vectors (OpenAI's text-embedding-ada-002)
3. **Creates vector index** - Speeds up similarity searches using IVFFlat algorithm

## Verify Migration

After running the migration, verify it worked:

```sql
-- Check if pgvector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check if embedding column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'kb_chunks' AND column_name = 'embedding';

-- Check if index was created
SELECT indexname FROM pg_indexes WHERE tablename = 'kb_chunks';
```

## Troubleshooting

### Error: "extension vector does not exist"
- pgvector extension is not installed on your PostgreSQL instance
- For Supabase: It should be available by default, try running `CREATE EXTENSION vector;` first

### Error: "not enough data to build index"
- The IVFFlat index requires some data
- Either upload a few documents first, then create the index
- Or use HNSW index instead (see commented line in migration file)

### Error: "permission denied"
- Make sure you're using a user with sufficient privileges
- For Supabase, use the service role key or run via SQL Editor

## After Migration

1. Restart your server to pick up the schema changes
2. Try uploading a document again
3. Check server logs to verify embeddings are being created
4. Test vector search functionality
