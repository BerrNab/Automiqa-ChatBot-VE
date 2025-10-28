import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkChunks() {
  const chatbotId = 'SFGJm3KQh901d4XRq5dWX';
  
  console.log('📋 Checking KB chunk content...\n');
  
  const { data: chunks, error } = await supabase
    .from('kb_chunks')
    .select('id, text, metadata')
    .eq('chatbot_id', chatbotId)
    .limit(3);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${chunks.length} chunks\n`);
  
  chunks.forEach((chunk, idx) => {
    console.log(`\n--- Chunk ${idx + 1} ---`);
    console.log('ID:', chunk.id);
    console.log('Text preview:', chunk.text.substring(0, 200));
    console.log('Metadata:', JSON.stringify(chunk.metadata, null, 2));
  });
}

checkChunks();
