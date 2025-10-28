import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function enableKBTools() {
  const chatbotId = 'SFGJm3KQh901d4XRq5dWX';
  
  console.log('🔧 Enabling Knowledge Base and MCP Tools...\n');
  
  // Get current config
  const { data: chatbot, error: fetchError } = await supabase
    .from('chatbots')
    .select('config')
    .eq('id', chatbotId)
    .single();
  
  if (fetchError) {
    console.error('❌ Error fetching chatbot:', fetchError);
    return;
  }
  
  const config = typeof chatbot.config === 'string' 
    ? JSON.parse(chatbot.config) 
    : chatbot.config;
  
  // Enable MCP Tools
  if (!config.mcpTools) {
    config.mcpTools = {};
  }
  config.mcpTools.enabled = true;
  
  // Enable Knowledge Base
  if (!config.knowledgeBase) {
    config.knowledgeBase = {
      enabled: true,
      autoLearn: false,
      updateFrequency: 'manual'
    };
  } else {
    config.knowledgeBase.enabled = true;
  }
  
  console.log('✅ Enabling:');
  console.log('   - MCP Tools: true');
  console.log('   - Knowledge Base: true\n');
  
  // Update chatbot
  const { error: updateError } = await supabase
    .from('chatbots')
    .update({ 
      config: JSON.stringify(config),
      updated_at: new Date().toISOString()
    })
    .eq('id', chatbotId);
  
  if (updateError) {
    console.error('❌ Error updating chatbot:', updateError);
    return;
  }
  
  console.log('🎉 Success! Configuration updated.\n');
  console.log('📝 Next steps:');
  console.log('   1. Refresh your chatbot page');
  console.log('   2. Test with: ما هي الإجراءات المتعلقة بالصفقات العمومية؟');
  console.log('   3. The agent should now use the search_knowledge_base tool\n');
}

enableKBTools();
