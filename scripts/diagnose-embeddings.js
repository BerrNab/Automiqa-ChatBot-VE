import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function diagnose() {
  const chatbotId = 'SFGJm3KQh901d4XRq5dWX';
  
  console.log('🔍 Diagnosing Knowledge Base Issues...\n');
  
  // 1. Check total chunks
  const { count: totalChunks } = await supabase
    .from('kb_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('chatbot_id', chatbotId);
  
  console.log(`📊 Total chunks: ${totalChunks}`);
  
  // 2. Check chunks WITH embeddings
  const { count: chunksWithEmbeddings } = await supabase
    .from('kb_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('chatbot_id', chatbotId)
    .not('embedding', 'is', null);
  
  console.log(`✅ Chunks with embeddings: ${chunksWithEmbeddings}`);
  console.log(`❌ Chunks WITHOUT embeddings: ${totalChunks - chunksWithEmbeddings}\n`);
  
  if (chunksWithEmbeddings === 0) {
    console.log('⚠️  PROBLEM FOUND: No chunks have embeddings!');
    console.log('   The document was uploaded but not vectorized.\n');
    
    // Check documents
    const { data: docs } = await supabase
      .from('kb_documents')
      .select('*')
      .eq('chatbot_id', chatbotId);
    
    console.log('📄 Documents:');
    docs?.forEach(doc => {
      console.log(`   - ${doc.filename} (Status: ${doc.status})`);
    });
    
    console.log('\n💡 SOLUTION:');
    console.log('   1. Delete the current document from the Knowledge Base');
    console.log('   2. Re-upload the procedures-knowledge-base.txt file');
    console.log('   3. Wait for the vectorization to complete');
    console.log('   4. Check the server logs for any errors during processing');
    
  } else {
    console.log('✅ Embeddings exist. Checking sample data...\n');
    
    // Get a sample chunk with embedding
    const { data: sample } = await supabase
      .from('kb_chunks')
      .select('text, embedding')
      .eq('chatbot_id', chatbotId)
      .not('embedding', 'is', null)
      .limit(1);
    
    if (sample && sample[0]) {
      console.log('📝 Sample chunk text:');
      console.log(`   ${sample[0].text.substring(0, 200)}...\n`);
      
      const embeddingArray = sample[0].embedding;
      if (typeof embeddingArray === 'string') {
        const parsed = JSON.parse(embeddingArray);
        console.log(`📊 Embedding info:`);
        console.log(`   - Type: ${typeof embeddingArray} (stored as string)`);
        console.log(`   - Dimensions: ${parsed.length}`);
        console.log(`   - First 5 values: [${parsed.slice(0, 5).join(', ')}...]`);
      } else if (Array.isArray(embeddingArray)) {
        console.log(`📊 Embedding info:`);
        console.log(`   - Type: Array`);
        console.log(`   - Dimensions: ${embeddingArray.length}`);
        console.log(`   - First 5 values: [${embeddingArray.slice(0, 5).join(', ')}...]`);
      } else {
        console.log(`📊 Embedding type: ${typeof embeddingArray}`);
        console.log(`   Value: ${embeddingArray}`);
      }
    }
    
    // Check if there are chunks with Arabic text
    const { data: arabicChunks } = await supabase
      .from('kb_chunks')
      .select('text')
      .eq('chatbot_id', chatbotId)
      .not('embedding', 'is', null)
      .limit(5);
    
    console.log('\n🔤 Checking for Arabic content:');
    let hasArabic = false;
    arabicChunks?.forEach((chunk, i) => {
      const containsArabic = /[\u0600-\u06FF]/.test(chunk.text);
      if (containsArabic) hasArabic = true;
      console.log(`   Chunk ${i + 1}: ${containsArabic ? '✅ Contains Arabic' : '❌ No Arabic'}`);
    });
    
    if (!hasArabic) {
      console.log('\n⚠️  WARNING: No Arabic text found in chunks!');
      console.log('   This might explain why Arabic queries return no results.');
    }
  }
  
  // Check documents status
  console.log('\n📋 Document Status:');
  const { data: allDocs } = await supabase
    .from('kb_documents')
    .select('filename, status, created_at')
    .eq('chatbot_id', chatbotId)
    .order('created_at', { ascending: false });
  
  allDocs?.forEach(doc => {
    console.log(`   - ${doc.filename}`);
    console.log(`     Status: ${doc.status}`);
    console.log(`     Created: ${new Date(doc.created_at).toLocaleString()}`);
  });
}

diagnose().catch(console.error);
