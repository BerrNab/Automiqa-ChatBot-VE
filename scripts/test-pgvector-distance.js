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

async function testPgvectorDistance() {
  const chatbotId = 'SFGJm3KQh901d4XRq5dWX';
  const query = 'الصفقات العمومية';
  
  console.log('🔍 Testing pgvector distance calculation...\n');
  
  try {
    // Create embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    console.log('✅ Query embedding created\n');
    
    // Test with raw SQL query using pgvector's <=> operator
    const { data, error } = await supabase.rpc('sql', {
      query: `
        SELECT 
          text,
          1 - (embedding <=> $1::vector) as similarity,
          embedding <=> $1::vector as distance
        FROM kb_chunks
        WHERE chatbot_id = $2
          AND embedding IS NOT NULL
          AND text LIKE '%الصفقات العمومية%'
        ORDER BY embedding <=> $1::vector
        LIMIT 5
      `,
      params: [JSON.stringify(queryEmbedding), chatbotId]
    });
    
    if (error) {
      console.error('❌ SQL Error:', error);
      
      // Try alternative: direct query without RPC
      console.log('\n🔄 Trying direct query...\n');
      
      const { data: chunks } = await supabase
        .from('kb_chunks')
        .select('text, embedding')
        .eq('chatbot_id', chatbotId)
        .not('embedding', 'is', null)
        .ilike('text', '%الصفقات العمومية%')
        .limit(5);
      
      if (chunks && chunks.length > 0) {
        console.log(`Found ${chunks.length} matching chunks\n`);
        
        // Calculate similarity manually
        chunks.forEach((chunk, i) => {
          let chunkEmbedding = typeof chunk.embedding === 'string' 
            ? JSON.parse(chunk.embedding) 
            : chunk.embedding;
          
          // Calculate using different methods
          const cosine = cosineSimilarity(queryEmbedding, chunkEmbedding);
          const euclidean = euclideanDistance(queryEmbedding, chunkEmbedding);
          const dotProduct = calculateDotProduct(queryEmbedding, chunkEmbedding);
          
          console.log(`${i + 1}. Text: ${chunk.text.substring(0, 100)}...`);
          console.log(`   Cosine Similarity: ${(cosine * 100).toFixed(2)}%`);
          console.log(`   Euclidean Distance: ${euclidean.toFixed(4)}`);
          console.log(`   Dot Product: ${dotProduct.toFixed(4)}`);
          console.log(`   Cosine Distance (1-similarity): ${(1 - cosine).toFixed(4)}\n`);
        });
        
        // Test with identical embedding (should be ~1.0 similarity)
        console.log('🧪 Testing with identical embedding (sanity check)...');
        const identicalSimilarity = cosineSimilarity(queryEmbedding, queryEmbedding);
        console.log(`   Identical embedding similarity: ${(identicalSimilarity * 100).toFixed(2)}%`);
        console.log(`   ${identicalSimilarity > 0.99 ? '✅ PASS' : '❌ FAIL'}\n`);
      }
    } else {
      console.log('✅ Results from pgvector:\n');
      data.forEach((row, i) => {
        console.log(`${i + 1}. Similarity: ${(row.similarity * 100).toFixed(2)}%`);
        console.log(`   Distance: ${row.distance.toFixed(4)}`);
        console.log(`   Text: ${row.text.substring(0, 100)}...\n`);
      });
    }
    
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

function euclideanDistance(vecA, vecB) {
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    sum += Math.pow(vecA[i] - vecB[i], 2);
  }
  return Math.sqrt(sum);
}

function calculateDotProduct(vecA, vecB) {
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    sum += vecA[i] * vecB[i];
  }
  return sum;
}

testPgvectorDistance();
