import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initializeSupabaseFunctions() {
  try {
    console.log('Creating vector similarity search function...');
    
    // Create the match_documents function for vector similarity search
    const matchDocumentsFunction = `
      CREATE OR REPLACE FUNCTION match_documents(
        query_embedding vector(1536),
        match_threshold float,
        match_count int,
        p_chatbot_id text
      )
      RETURNS TABLE (
        id uuid,
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
          c.id::uuid,
          c.text,
          1 - (c.embedding <=> query_embedding) as similarity,
          d.filename,
          c.metadata
        FROM
          kb_chunks c
        JOIN
          kb_documents d ON c.document_id = d.id
        WHERE
          c.chatbot_id = p_chatbot_id
          AND 1 - (c.embedding <=> query_embedding) > match_threshold
        ORDER BY
          c.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;
    `;
    
    // Execute the function creation
    const { error } = await supabase.rpc('exec_sql', { sql_query: matchDocumentsFunction });
    
    if (error) {
      console.error('Error creating match_documents function:', error);
    } else {
      console.log('Successfully created match_documents function');
    }
    
    // Create exec_sql function if it doesn't exist
    // Note: This function requires superuser privileges and may need to be created manually in the Supabase SQL editor
    console.log('Note: The exec_sql function may need to be created manually with superuser privileges.');
    console.log('You can create it with the following SQL:');
    console.log(`
      CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
      RETURNS void
      LANGUAGE plpgsql
      AS $$
      BEGIN
        EXECUTE sql_query;
      END;
      $$;
    `);
    
    console.log('Initialization completed successfully!');
  } catch (error) {
    console.error('Error during initialization:', error);
    process.exit(1);
  }
}

// Execute the initialization
initializeSupabaseFunctions();
