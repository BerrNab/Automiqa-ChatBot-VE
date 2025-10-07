import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import the storage implementation
import { storage } from '../server/storage-supabase.js';

/**
 * Export data from in-memory storage to JSON files
 * This can be used to migrate data from in-memory storage to Supabase
 */
async function exportData() {
  try {
    console.log('Starting data export...');
    
    // Create export directory if it doesn't exist
    const exportDir = path.resolve(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }
    
    // Export clients
    console.log('Exporting clients...');
    const clients = await storage.getClientsWithChatbots();
    fs.writeFileSync(
      path.resolve(exportDir, 'clients.json'),
      JSON.stringify(clients, null, 2)
    );
    console.log(`Exported ${clients.length} clients`);
    
    // Export chatbots
    console.log('Exporting chatbots...');
    const chatbots = await storage.getChatbotsWithClients();
    fs.writeFileSync(
      path.resolve(exportDir, 'chatbots.json'),
      JSON.stringify(chatbots, null, 2)
    );
    console.log(`Exported ${chatbots.length} chatbots`);
    
    // Export subscriptions
    console.log('Exporting subscriptions...');
    const subscriptions = await storage.getSubscriptionsWithClients();
    fs.writeFileSync(
      path.resolve(exportDir, 'subscriptions.json'),
      JSON.stringify(subscriptions, null, 2)
    );
    console.log(`Exported ${subscriptions.length} subscriptions`);
    
    // Export payment logs
    console.log('Exporting payment logs...');
    const payments = await storage.getPaymentsWithClients();
    fs.writeFileSync(
      path.resolve(exportDir, 'payments.json'),
      JSON.stringify(payments, null, 2)
    );
    console.log(`Exported ${payments.length} payment logs`);
    
    console.log('Data export completed successfully!');
    console.log(`Files saved to: ${exportDir}`);
    console.log('\nTo import this data into Supabase:');
    console.log('1. Configure your Supabase environment variables in .env');
    console.log('2. Run: npm run db:migrate');
    console.log('3. Run: npm run db:import');
  } catch (error) {
    console.error('Error during data export:', error);
    process.exit(1);
  }
}

// Execute the export
exportData();
