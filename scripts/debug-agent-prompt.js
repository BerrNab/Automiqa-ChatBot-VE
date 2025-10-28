import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugPrompt() {
  const chatbotId = 'SFGJm3KQh901d4XRq5dWX';
  
  const { data: chatbot } = await supabase
    .from('chatbots')
    .select('config')
    .eq('id', chatbotId)
    .single();
  
  const config = typeof chatbot.config === 'string' 
    ? JSON.parse(chatbot.config) 
    : chatbot.config;
  
  console.log('🔍 Checking config values:\n');
  console.log('knowledgeBase:', config.knowledgeBase);
  console.log('knowledgeBase?.enabled:', config.knowledgeBase?.enabled);
  console.log('mcpTools:', config.mcpTools);
  console.log('mcpTools?.enabled:', config.mcpTools?.enabled);
  
  console.log('\n📋 Config type:', typeof config.knowledgeBase);
  console.log('Is object:', config.knowledgeBase && typeof config.knowledgeBase === 'object');
}

debugPrompt();
