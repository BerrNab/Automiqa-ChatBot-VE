import bcrypt from 'bcrypt';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, '../.env') });

async function createAdminUser() {
  // Admin credentials
  const username = 'admin';
  const email = 'admin@example.com';
  const password = 'admin123'; // Simple password for development

  try {
    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Connect to Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration. Please check your .env file.');
      process.exit(1);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if admin already exists
    const { data: existingAdmins, error: checkError } = await supabase
      .from('admins')
      .select('*')
      .or(`username.eq.${username},email.eq.${email}`);
    
    if (checkError) {
      console.error('Error checking for existing admin:', checkError);
      process.exit(1);
    }

    if (existingAdmins && existingAdmins.length > 0) {
      console.log('Admin user already exists. Skipping creation.');
      return;
    }

    // Insert the admin user
    const adminId = nanoid();
    const { data, error: insertError } = await supabase
      .from('admins')
      .insert({
        id: adminId,
        username,
        email,
        password: passwordHash
      })
      .select();
    
    if (insertError) {
      console.error('Error creating admin user:', insertError);
      process.exit(1);
    }

    console.log(`Admin user created with ID: ${adminId}`);
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser().catch(console.error);
