import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    console.log('🔧 Supabase Admin User Creator\n');

    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
      process.exit(1);
    }

    // Create Supabase admin client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get user input
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password: ');
    const username = await question('Enter admin username (optional): ');

    if (!email || !password) {
      console.error('❌ Email and password are required');
      rl.close();
      process.exit(1);
    }

    console.log('\n🔄 Creating admin user...');

    // Create user with admin role
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        username: username || email.split('@')[0],
      }
    });

    if (error) {
      console.error('❌ Error creating admin:', error.message);
      rl.close();
      process.exit(1);
    }

    console.log('\n✅ Admin user created successfully!');
    console.log('\nUser Details:');
    console.log('  ID:', data.user.id);
    console.log('  Email:', data.user.email);
    console.log('  Username:', data.user.user_metadata.username);
    console.log('  Role:', data.user.user_metadata.role);
    console.log('\n📝 You can now login with:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);

    rl.close();
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    rl.close();
    process.exit(1);
  }
}

createAdmin();
