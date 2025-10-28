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

async function testDirectSimilarity() {
  const chatbotId = 'SFGJm3KQh901d4XRq5dWX';
  const query = 'الصفقات العمومية';
  
  console.log('🔍 Testing Direct Similarity Calculation...\n');
  console.log(`Query: ${query}\n`);
  
  try {
    // Create embedding for query
    console.log('📊 Creating query embedding...');
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;
    console.log(`✅ Query embedding created (${queryEmbedding.length} dimensions)\n`);
    
    // Get chunks with their embeddings and calculate similarity manually
    console.log('📚 Fetching chunks and calculating similarity...\n');
    
    const { data: chunks, error } = await supabase
      .from('kb_chunks')
      .select('id, text, embedding')
      .eq('chatbot_id', chatbotId)
      .not('embedding', 'is', null)
      .limit(10);
    
    if (error) {
      console.error('❌ Error fetching chunks:', error);
      return;
    }
    
    console.log(`Found ${chunks.length} chunks. Calculating similarities...\n`);
    
    // Calculate cosine similarity manually
    const results = chunks.map(chunk => {
      let chunkEmbedding;
      
      // Parse embedding if it's a string
      if (typeof chunk.embedding === 'string') {
        chunkEmbedding = JSON.parse(chunk.embedding);
      } else {
        chunkEmbedding = chunk.embedding;
      }
      
      // Calculate cosine similarity
      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
      
      return {
        text: chunk.text.substring(0, 150),
        similarity: similarity,
        containsQuery: chunk.text.includes('الصفقات العمومية')
      };
    });
    
    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);
    
    console.log('🎯 Top 5 Results:\n');
    results.slice(0, 5).forEach((result, i) => {
      console.log(`${i + 1}. Similarity: ${(result.similarity * 100).toFixed(2)}%`);
      console.log(`   Contains "الصفقات العمومية": ${result.containsQuery ? '✅ YES' : '❌ NO'}`);
      console.log(`   Text: ${result.text}...`);
      console.log('');
    });
    
    // Check if any results meet common thresholds
    console.log('📊 Threshold Analysis:');
    [0.3, 0.4, 0.5, 0.6, 0.7, 0.8].forEach(threshold => {
      const count = results.filter(r => r.similarity >= threshold).length;
      console.log(`   Threshold ${threshold}: ${count} results`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Calculate cosine similarity between two vectors
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

testDirectSimilarity();
