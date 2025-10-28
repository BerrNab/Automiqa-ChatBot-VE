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

async function findRelevantChunks() {
  const chatbotId = 'SFGJm3KQh901d4XRq5dWX';
  const searchTerm = 'الصفقات العمومية';
  
  console.log('🔍 Searching for chunks containing "الصفقات العمومية"...\n');
  
  try {
    // Get ALL chunks
    const { data: allChunks, error } = await supabase
      .from('kb_chunks')
      .select('id, text, embedding')
      .eq('chatbot_id', chatbotId)
      .not('embedding', 'is', null);
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log(`📚 Total chunks: ${allChunks.length}\n`);
    
    // Filter chunks that contain the search term
    const matchingChunks = allChunks.filter(chunk => 
      chunk.text.includes(searchTerm)
    );
    
    console.log(`✅ Chunks containing "${searchTerm}": ${matchingChunks.length}\n`);
    
    if (matchingChunks.length === 0) {
      console.log('❌ NO CHUNKS FOUND with this text!');
      console.log('\n💡 This means the procedures about "الصفقات العمومية" were not included');
      console.log('   in the uploaded file or were chunked in a way that split the text.\n');
      
      // Search for partial matches
      console.log('🔍 Searching for partial matches...\n');
      const partialMatches = allChunks.filter(chunk => 
        chunk.text.includes('الصفقات') || chunk.text.includes('العمومية')
      );
      
      console.log(`Found ${partialMatches.length} chunks with partial matches:\n`);
      partialMatches.slice(0, 5).forEach((chunk, i) => {
        console.log(`${i + 1}. ${chunk.text.substring(0, 200)}...\n`);
      });
      
      return;
    }
    
    // Now test similarity with these matching chunks
    console.log('📊 Testing similarity with matching chunks...\n');
    
    const query = 'ما هي الإجراءات المتعلقة بالصفقات العمومية؟';
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    const results = matchingChunks.slice(0, 5).map(chunk => {
      let chunkEmbedding;
      if (typeof chunk.embedding === 'string') {
        chunkEmbedding = JSON.parse(chunk.embedding);
      } else {
        chunkEmbedding = chunk.embedding;
      }
      
      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
      
      return {
        text: chunk.text.substring(0, 300),
        similarity: similarity
      };
    });
    
    results.sort((a, b) => b.similarity - a.similarity);
    
    console.log('🎯 Top matching chunks with similarity:\n');
    results.forEach((result, i) => {
      console.log(`${i + 1}. Similarity: ${(result.similarity * 100).toFixed(2)}%`);
      console.log(`   Text: ${result.text}...\n`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

findRelevantChunks();
