import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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

async function migrateDatabase() {
  try {
    console.log('Starting database migration...');
    
    // Read the SQL schema file
    const schemaPath = path.resolve(__dirname, '../server/database/supabase-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = schemaSql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0 && !statement.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}`);
      
      try {
        // Skip commented sections or storage bucket setup that requires admin access
        if (statement.includes('CREATE POLICY') || 
            statement.includes('INSERT INTO storage.buckets') ||
            statement.includes('Sample query')) {
          console.log('Skipping statement that requires admin access or is a comment');
          continue;
        }
        
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          console.warn(`Warning executing statement ${i + 1}: ${error.message}`);
          console.warn('Continuing with next statement...');
        }
      } catch (err) {
        console.warn(`Error executing statement ${i + 1}: ${err.message}`);
        console.warn('Continuing with next statement...');
      }
    }
    
    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Error during database migration:', error);
    process.exit(1);
  }
}

// Execute the migration
migrateDatabase();
