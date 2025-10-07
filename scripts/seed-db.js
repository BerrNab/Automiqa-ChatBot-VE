import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

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

// Default admin user
const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@example.com',
  password: 'admin123' // This should be changed after first login
};

// Default email notification settings
const DEFAULT_EMAIL_SETTINGS = [
  {
    notification_type: 'trial-expiring-7days',
    enabled: true,
    trigger_days: 7,
    from_email: 'noreply@chatbotsaas.com',
    from_name: 'Chatbot SaaS',
    reply_to_email: 'support@chatbotsaas.com'
  },
  {
    notification_type: 'trial-expiring-3days',
    enabled: true,
    trigger_days: 3,
    from_email: 'noreply@chatbotsaas.com',
    from_name: 'Chatbot SaaS',
    reply_to_email: 'support@chatbotsaas.com'
  },
  {
    notification_type: 'trial-expiring-1day',
    enabled: true,
    trigger_days: 1,
    from_email: 'noreply@chatbotsaas.com',
    from_name: 'Chatbot SaaS',
    reply_to_email: 'support@chatbotsaas.com'
  },
  {
    notification_type: 'trial-expired',
    enabled: true,
    trigger_days: null,
    from_email: 'noreply@chatbotsaas.com',
    from_name: 'Chatbot SaaS',
    reply_to_email: 'support@chatbotsaas.com'
  },
  {
    notification_type: 'payment-reminder',
    enabled: true,
    trigger_days: 3,
    from_email: 'noreply@chatbotsaas.com',
    from_name: 'Chatbot SaaS',
    reply_to_email: 'support@chatbotsaas.com'
  },
  {
    notification_type: 'payment-failed',
    enabled: true,
    trigger_days: null,
    from_email: 'noreply@chatbotsaas.com',
    from_name: 'Chatbot SaaS',
    reply_to_email: 'support@chatbotsaas.com'
  },
  {
    notification_type: 'subscription-reactivated',
    enabled: true,
    trigger_days: null,
    from_email: 'noreply@chatbotsaas.com',
    from_name: 'Chatbot SaaS',
    reply_to_email: 'support@chatbotsaas.com'
  }
];

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Check if admin already exists
    const { data: existingAdmins } = await supabase
      .from('admins')
      .select('*')
      .eq('username', DEFAULT_ADMIN.username);
    
    if (existingAdmins && existingAdmins.length > 0) {
      console.log('Admin user already exists, skipping creation');
    } else {
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, saltRounds);
      
      // Create admin user
      const { error: adminError } = await supabase
        .from('admins')
        .insert({
          id: nanoid(),
          username: DEFAULT_ADMIN.username,
          email: DEFAULT_ADMIN.email,
          password: hashedPassword
        });
      
      if (adminError) {
        console.error('Error creating admin user:', adminError);
      } else {
        console.log('Admin user created successfully');
      }
    }
    
    // Check if email settings already exist
    const { data: existingSettings } = await supabase
      .from('email_settings')
      .select('*');
    
    if (existingSettings && existingSettings.length > 0) {
      console.log('Email settings already exist, skipping creation');
    } else {
      // Create email notification settings
      for (const setting of DEFAULT_EMAIL_SETTINGS) {
        const { error: settingError } = await supabase
          .from('email_settings')
          .insert({
            id: nanoid(),
            ...setting
          });
        
        if (settingError) {
          console.error(`Error creating email setting ${setting.notification_type}:`, settingError);
        }
      }
      
      console.log('Email settings created successfully');
    }
    
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error during database seeding:', error);
    process.exit(1);
  }
}

// Execute the seeding
seedDatabase();
