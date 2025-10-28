import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkConfig() {
  const chatbotId = 'SFGJm3KQh901d4XRq5dWX';
  
  console.log('🔍 Checking chatbot configuration...\n');
  
  const { data: chatbot, error } = await supabase
    .from('chatbots')
    .select('*')
    .eq('id', chatbotId)
    .single();
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('📋 Chatbot:', chatbot.name);
  console.log('\n📝 Configuration:');
  
  const config = typeof chatbot.config === 'string' 
    ? JSON.parse(chatbot.config) 
    : chatbot.config;
  
  console.log('\n🔧 MCP Tools:');
  console.log('  Enabled:', config.mcpTools?.enabled ?? 'not set');
  
  console.log('\n📚 Knowledge Base:');
  console.log('  Enabled:', config.knowledgeBase?.enabled ?? 'not set');
  
  console.log('\n📅 Appointments:');
  console.log('  Enabled:', config.appointments?.enabled ?? 'not set');
  console.log('  Types:', config.appointments?.types?.length ?? 0);
  
  console.log('\n💬 Fallback Message:');
  console.log('  ', config.fallbackMessage || 'not set');
  
  console.log('\n🌐 Language:');
  console.log('  Primary:', config.language || 'not set');
  
  console.log('\n\n📄 Full Config:');
  console.log(JSON.stringify(config, null, 2));
}

checkConfig();
