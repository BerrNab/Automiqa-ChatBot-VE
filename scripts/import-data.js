import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
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

/**
 * Import data from JSON files into Supabase
 * This can be used to migrate data from in-memory storage to Supabase
 */
async function importData() {
  try {
    console.log('Starting data import...');
    
    // Check if export directory exists
    const exportDir = path.resolve(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) {
      console.error('Export directory not found. Please run export-data.js first.');
      process.exit(1);
    }
    
    // Import clients
    if (fs.existsSync(path.resolve(exportDir, 'clients.json'))) {
      console.log('Importing clients...');
      const clients = JSON.parse(fs.readFileSync(path.resolve(exportDir, 'clients.json'), 'utf8'));
      
      for (const client of clients) {
        // Check if client already exists
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('id', client.id)
          .single();
        
        if (existingClient) {
          console.log(`Client ${client.name} already exists, skipping...`);
          continue;
        }
        
        // Insert client
        const { error } = await supabase
          .from('clients')
          .insert({
            id: client.id || nanoid(),
            name: client.name,
            contact_email: client.contactEmail,
            auth_email: client.authEmail,
            password_hash: client.passwordHash,
            industry: client.industry,
            description: client.description,
            status: client.status || 'active',
            created_at: client.createdAt || new Date().toISOString()
          });
        
        if (error) {
          console.error(`Error importing client ${client.name}:`, error);
        } else {
          console.log(`Imported client: ${client.name}`);
        }
      }
    }
    
    // Import chatbots
    if (fs.existsSync(path.resolve(exportDir, 'chatbots.json'))) {
      console.log('Importing chatbots...');
      const chatbots = JSON.parse(fs.readFileSync(path.resolve(exportDir, 'chatbots.json'), 'utf8'));
      
      for (const chatbot of chatbots) {
        // Check if chatbot already exists
        const { data: existingChatbot } = await supabase
          .from('chatbots')
          .select('id')
          .eq('id', chatbot.id)
          .single();
        
        if (existingChatbot) {
          console.log(`Chatbot ${chatbot.name} already exists, skipping...`);
          continue;
        }
        
        // Insert chatbot
        const { error } = await supabase
          .from('chatbots')
          .insert({
            id: chatbot.id || nanoid(),
            client_id: chatbot.clientId,
            name: chatbot.name,
            description: chatbot.description,
            config: chatbot.config || {},
            widget_url: chatbot.widgetUrl,
            status: chatbot.status || 'active',
            message_count: chatbot.messageCount || 0,
            response_rate: chatbot.responseRate || 0,
            created_at: chatbot.createdAt || new Date().toISOString(),
            updated_at: chatbot.updatedAt || new Date().toISOString()
          });
        
        if (error) {
          console.error(`Error importing chatbot ${chatbot.name}:`, error);
        } else {
          console.log(`Imported chatbot: ${chatbot.name}`);
        }
      }
    }
    
    // Import subscriptions
    if (fs.existsSync(path.resolve(exportDir, 'subscriptions.json'))) {
      console.log('Importing subscriptions...');
      const subscriptions = JSON.parse(fs.readFileSync(path.resolve(exportDir, 'subscriptions.json'), 'utf8'));
      
      for (const subscription of subscriptions) {
        // Check if subscription already exists
        const { data: existingSubscription } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('id', subscription.id)
          .single();
        
        if (existingSubscription) {
          console.log(`Subscription for client ${subscription.clientId} already exists, skipping...`);
          continue;
        }
        
        // Insert subscription
        const { error } = await supabase
          .from('subscriptions')
          .insert({
            id: subscription.id || nanoid(),
            client_id: subscription.clientId,
            chatbot_id: subscription.chatbotId,
            type: subscription.type,
            status: subscription.status,
            trial_start: subscription.trialStart,
            trial_end: subscription.trialEnd,
            paid_until: subscription.paidUntil,
            monthly_amount: subscription.monthlyAmount || 0,
            created_at: subscription.createdAt || new Date().toISOString(),
            updated_at: subscription.updatedAt || new Date().toISOString()
          });
        
        if (error) {
          console.error(`Error importing subscription for client ${subscription.clientId}:`, error);
        } else {
          console.log(`Imported subscription for client ${subscription.clientId}`);
        }
      }
    }
    
    // Import payment logs
    if (fs.existsSync(path.resolve(exportDir, 'payments.json'))) {
      console.log('Importing payment logs...');
      const payments = JSON.parse(fs.readFileSync(path.resolve(exportDir, 'payments.json'), 'utf8'));
      
      for (const payment of payments) {
        // Check if payment already exists
        const { data: existingPayment } = await supabase
          .from('payment_logs')
          .select('id')
          .eq('id', payment.id)
          .single();
        
        if (existingPayment) {
          console.log(`Payment ${payment.id} already exists, skipping...`);
          continue;
        }
        
        // Insert payment
        const { error } = await supabase
          .from('payment_logs')
          .insert({
            id: payment.id || nanoid(),
            client_id: payment.clientId,
            subscription_id: payment.subscriptionId,
            amount: payment.amount,
            currency: payment.currency || 'usd',
            status: payment.status,
            failure_reason: payment.failureReason,
            created_at: payment.createdAt || new Date().toISOString()
          });
        
        if (error) {
          console.error(`Error importing payment ${payment.id}:`, error);
        } else {
          console.log(`Imported payment: ${payment.id}`);
        }
      }
    }
    
    console.log('Data import completed successfully!');
  } catch (error) {
    console.error('Error during data import:', error);
    process.exit(1);
  }
}

// Execute the import
importData();
