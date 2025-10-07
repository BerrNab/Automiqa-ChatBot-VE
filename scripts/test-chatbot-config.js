// Script to test chatbot config parsing
const { supabaseStorage } = require('../server/storage-supabase');

// Test function
async function testChatbotConfigParsing() {
  try {
    // Get the chatbot ID from command line arguments or use a default
    const chatbotId = process.argv[2] || 'p0uvmVPA6lPfrelE8shpH';
    
    console.log(`Testing chatbot config parsing for ID: ${chatbotId}`);
    
    // Get the chatbot
    const chatbot = await supabaseStorage.getChatbot(chatbotId);
    
    if (!chatbot) {
      console.error(`Chatbot with ID ${chatbotId} not found`);
      process.exit(1);
    }
    
    console.log('Chatbot found:');
    console.log(`ID: ${chatbot.id}`);
    console.log(`Name: ${chatbot.name}`);
    console.log(`Client ID: ${chatbot.client_id}`);
    
    // Check if config is properly parsed
    if (typeof chatbot.config === 'string') {
      console.error('ERROR: Config is still a string!');
      console.log('Config:', chatbot.config);
      process.exit(1);
    } else if (typeof chatbot.config === 'object') {
      console.log('SUCCESS: Config is properly parsed as an object');
      
      // Check if config has expected properties
      const configKeys = Object.keys(chatbot.config);
      console.log(`Config has ${configKeys.length} top-level keys:`, configKeys);
      
      // Check if branding exists
      if (chatbot.config.branding) {
        console.log('Branding found:', chatbot.config.branding);
      }
      
      // Check if behavior exists
      if (chatbot.config.behavior) {
        console.log('Behavior found with keys:', Object.keys(chatbot.config.behavior));
      }
      
      // Check if widgetSettings exists
      if (chatbot.config.widgetSettings) {
        console.log('Widget settings found with keys:', Object.keys(chatbot.config.widgetSettings));
      }
    } else {
      console.error(`ERROR: Config has unexpected type: ${typeof chatbot.config}`);
      process.exit(1);
    }
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
}

// Run the test
testChatbotConfigParsing();
