import 'dotenv/config';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testSearch() {
  const chatbotId = 'SFGJm3KQh901d4XRq5dWX'; // Your chatbot ID
  const query = 'ما هي الإجراءات المتعلقة بالصفقات العمومية؟';
  
  console.log('🔍 Testing knowledge base search...\n');
  console.log(`Chatbot ID: ${chatbotId}`);
  console.log(`Query: ${query}\n`);
  
  try {
    // Step 1: Create embedding for the query
    console.log('📊 Creating embedding for query...');
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;
    console.log(`✅ Embedding created (${queryEmbedding.length} dimensions)\n`);
    
    // Step 2: Test with different thresholds
    const thresholds = [0.3, 0.4, 0.5, 0.6, 0.7];
    
    for (const threshold of thresholds) {
      console.log(`\n🎯 Testing with threshold: ${threshold}`);
      console.log('─'.repeat(50));
      
      const { data, error } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: 5,
        p_chatbot_id: chatbotId
      });
      
      if (error) {
        console.error(`❌ Error:`, error);
        continue;
      }
      
      if (!data || data.length === 0) {
        console.log(`   No results found`);
        continue;
      }
      
      console.log(`   ✅ Found ${data.length} results:`);
      data.forEach((result, index) => {
        console.log(`\n   ${index + 1}. Similarity: ${(result.similarity * 100).toFixed(2)}%`);
        console.log(`      File: ${result.filename}`);
        console.log(`      Text preview: ${result.text.substring(0, 100)}...`);
      });
    }
    
    // Step 3: Check total chunks for this chatbot
    console.log('\n\n📚 Checking total chunks in knowledge base...');
    const { count, error: countError } = await supabase
      .from('kb_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('chatbot_id', chatbotId);
    
    if (countError) {
      console.error('❌ Error counting chunks:', countError);
    } else {
      console.log(`✅ Total chunks for chatbot: ${count}`);
    }
    
    // Step 4: Get sample chunks
    console.log('\n📄 Sample chunks:');
    const { data: sampleChunks, error: sampleError } = await supabase
      .from('kb_chunks')
      .select('text, metadata')
      .eq('chatbot_id', chatbotId)
      .limit(3);
    
    if (sampleError) {
      console.error('❌ Error getting samples:', sampleError);
    } else if (sampleChunks) {
      sampleChunks.forEach((chunk, index) => {
        console.log(`\n${index + 1}. ${chunk.text.substring(0, 150)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSearch();
