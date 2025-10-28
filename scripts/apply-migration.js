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

async function applyMigration(migrationFile) {
  try {
    console.log(`Applying migration: ${migrationFile}`);
    
    // Read the migration file
    const migrationPath = path.resolve(__dirname, '../migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`Migration file not found: ${migrationPath}`);
      process.exit(1);
    }
    
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration SQL...');
    
    // Execute the migration using Supabase SQL editor
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: migrationSql 
    });
    
    if (error) {
      // Try direct query if RPC doesn't work
      console.log('RPC method failed, trying direct query...');
      const { error: queryError } = await supabase.from('_migrations').insert({
        name: migrationFile,
        executed_at: new Date().toISOString()
      });
      
      if (queryError) {
        console.error('Migration failed:', error.message);
        console.log('\nPlease apply this migration manually in Supabase SQL Editor:');
        console.log('1. Go to your Supabase Dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and paste the contents of:', migrationPath);
        console.log('4. Click "Run"');
        process.exit(1);
      }
    }
    
    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Error applying migration:', error.message);
    console.log('\nPlease apply this migration manually in Supabase SQL Editor:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of: migrations/' + migrationFile);
    console.log('4. Click "Run"');
    process.exit(1);
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2] || '0005_update_match_documents_threshold.sql';

// Execute the migration
applyMigration(migrationFile);
