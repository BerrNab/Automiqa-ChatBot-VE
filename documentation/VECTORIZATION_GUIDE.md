# Vectorization Guide for Administrative Procedures

**Date:** October 26, 2025  
**Use Case:** Arabic Administrative Procedures (Invest Platform)

---

## Overview

You have a JSON array of administrative procedures in Arabic that need to be vectorized and made searchable by the chatbot. This guide shows you how to properly format and vectorize this data.

---

## Data Structure Analysis

Your data contains:
- **procedureId**: Unique identifier
- **thematicTitle**: Main category (e.g., "المقاولة والأعمال" - Business & Work)
- **subThematicTitle**: Subcategory (e.g., "الصفقات العمومية" - Public Contracts)
- **vectorizedText**: Combined text with:
  - Procedure name
  - Full details
  - Required documents
  - Legal references
  - Processing time

---

## Solution: Two Approaches

### Approach 1: Direct Knowledge Base Upload (Recommended)

Convert your JSON array to a structured text document that can be uploaded to the knowledge base.

#### Step 1: Create a Formatted Text File

```typescript
// Script: convert-procedures-to-text.ts
import * as fs from 'fs';

interface Procedure {
  procedureId: string;
  thematicTitle: string;
  subThematicTitle: string;
  vectorizedText: string;
}

function convertProceduresToText(procedures: Procedure[]): string {
  let output = '# دليل الإجراءات الإدارية\n\n';
  output += 'هذا الدليل يحتوي على جميع الإجراءات الإدارية المتاحة.\n\n';
  output += '---\n\n';

  procedures.forEach((proc, index) => {
    output += `## ${index + 1}. ${proc.thematicTitle} - ${proc.subThematicTitle}\n\n`;
    output += `**رقم الإجراء:** ${proc.procedureId}\n\n`;
    output += `${proc.vectorizedText}\n\n`;
    output += '---\n\n';
  });

  return output;
}

// Usage
const procedures: Procedure[] = JSON.parse(
  fs.readFileSync('procedures.json', 'utf-8')
);

const textContent = convertProceduresToText(procedures);
fs.writeFileSync('procedures-knowledge-base.txt', textContent, 'utf-8');

console.log('✅ Created procedures-knowledge-base.txt');
```

#### Step 2: Upload to Knowledge Base

1. Go to **Edit Chatbot** → **Knowledge Base** tab
2. Click **"Upload Document"**
3. Upload the generated `procedures-knowledge-base.txt` file
4. The system will automatically vectorize and index it

---

### Approach 2: Database Integration (Advanced)

Store procedures in the database and vectorize them programmatically.

#### Step 1: Create Procedures Table

```sql
-- Migration: Create procedures table
CREATE TABLE IF NOT EXISTS procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_id INTEGER NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  procedure_id VARCHAR(255) NOT NULL,
  thematic_title VARCHAR(500) NOT NULL,
  sub_thematic_title VARCHAR(500) NOT NULL,
  vectorized_text TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 embeddings
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS procedures_embedding_idx 
ON procedures USING ivfflat (embedding vector_cosine_ops);

-- Create index for chatbot lookup
CREATE INDEX IF NOT EXISTS procedures_chatbot_id_idx 
ON procedures(chatbot_id);
```

#### Step 2: Create Vectorization Service

```typescript
// server/services/procedure-vectorization.ts
import OpenAI from 'openai';
import { db } from '@db';
import { procedures } from '@db/schema';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Procedure {
  procedureId: string;
  thematicTitle: string;
  subThematicTitle: string;
  vectorizedText: string;
}

export class ProcedureVectorizationService {
  /**
   * Vectorize and store a single procedure
   */
  async vectorizeProcedure(
    chatbotId: number,
    procedure: Procedure
  ): Promise<void> {
    try {
      // Create embedding using OpenAI
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: procedure.vectorizedText,
      });

      const embedding = response.data[0].embedding;

      // Store in database
      await db.insert(procedures).values({
        chatbotId,
        procedureId: procedure.procedureId,
        thematicTitle: procedure.thematicTitle,
        subThematicTitle: procedure.subThematicTitle,
        vectorizedText: procedure.vectorizedText,
        embedding: JSON.stringify(embedding), // pgvector format
      });

      console.log(`✅ Vectorized procedure: ${procedure.procedureId}`);
    } catch (error) {
      console.error(`❌ Error vectorizing procedure:`, error);
      throw error;
    }
  }

  /**
   * Vectorize multiple procedures in batch
   */
  async vectorizeProcedures(
    chatbotId: number,
    procedures: Procedure[]
  ): Promise<void> {
    console.log(`Starting vectorization of ${procedures.length} procedures...`);

    for (let i = 0; i < procedures.length; i++) {
      await this.vectorizeProcedure(chatbotId, procedures[i]);
      
      // Rate limiting: wait 100ms between requests
      if (i < procedures.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Completed vectorization of ${procedures.length} procedures`);
  }

  /**
   * Search procedures by semantic similarity
   */
  async searchProcedures(
    chatbotId: number,
    query: string,
    limit: number = 5
  ): Promise<any[]> {
    try {
      // Create embedding for the query
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: query,
      });

      const queryEmbedding = response.data[0].embedding;

      // Search using vector similarity
      const results = await db.execute(`
        SELECT 
          procedure_id,
          thematic_title,
          sub_thematic_title,
          vectorized_text,
          1 - (embedding <=> $1::vector) as similarity
        FROM procedures
        WHERE chatbot_id = $2
        ORDER BY embedding <=> $1::vector
        LIMIT $3
      `, [JSON.stringify(queryEmbedding), chatbotId, limit]);

      return results.rows;
    } catch (error) {
      console.error('Error searching procedures:', error);
      throw error;
    }
  }
}

export const procedureVectorizationService = new ProcedureVectorizationService();
```

#### Step 3: Create API Endpoint

```typescript
// server/routes/procedures.ts
import { Router } from 'express';
import { procedureVectorizationService } from '../services/procedure-vectorization';

const router = Router();

/**
 * POST /api/chatbots/:id/procedures/vectorize
 * Vectorize procedures for a chatbot
 */
router.post('/:id/procedures/vectorize', async (req, res) => {
  try {
    const chatbotId = parseInt(req.params.id);
    const { procedures } = req.body;

    if (!Array.isArray(procedures)) {
      return res.status(400).json({ 
        error: 'procedures must be an array' 
      });
    }

    await procedureVectorizationService.vectorizeProcedures(
      chatbotId,
      procedures
    );

    res.json({ 
      success: true, 
      message: `Vectorized ${procedures.length} procedures` 
    });
  } catch (error: any) {
    console.error('Error vectorizing procedures:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/chatbots/:id/procedures/search
 * Search procedures by query
 */
router.get('/:id/procedures/search', async (req, res) => {
  try {
    const chatbotId = parseInt(req.params.id);
    const { q, limit = 5 } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'query parameter required' });
    }

    const results = await procedureVectorizationService.searchProcedures(
      chatbotId,
      q,
      parseInt(limit as string)
    );

    res.json({ results });
  } catch (error: any) {
    console.error('Error searching procedures:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

#### Step 4: Integrate with LangChain Agent

```typescript
// Update: server/services/langchain-agent.ts
import { procedureVectorizationService } from './procedure-vectorization';

// Add to createMCPTools method
if (config.knowledgeBase?.enabled) {
  tools.push(new DynamicStructuredTool({
    name: "search_procedures",
    description: "Search administrative procedures by query. Use this when user asks about procedures, documents, or administrative processes.",
    schema: z.object({
      query: z.string().describe("Search query in Arabic or French"),
      limit: z.number().optional().describe("Number of results (default: 5)"),
    }),
    func: async (input) => {
      try {
        const results = await procedureVectorizationService.searchProcedures(
          context.chatbotId,
          input.query,
          input.limit || 5
        );

        if (results.length === 0) {
          return "لم يتم العثور على إجراءات مطابقة لاستفسارك.";
        }

        let response = "الإجراءات المتاحة:\n\n";
        results.forEach((proc, index) => {
          response += `${index + 1}. ${proc.thematic_title} - ${proc.sub_thematic_title}\n`;
          response += `${proc.vectorized_text}\n\n`;
        });

        return response;
      } catch (error: any) {
        console.error('[Tool] Error searching procedures:', error);
        return `خطأ في البحث: ${error.message}`;
      }
    },
  }));
}
```

---

## Recommended Workflow

### For Quick Setup (Approach 1)

1. **Convert JSON to Text:**
   ```bash
   node convert-procedures-to-text.ts
   ```

2. **Upload to Knowledge Base:**
   - Go to chatbot settings
   - Upload the generated text file
   - System automatically vectorizes

3. **Test:**
   - Ask chatbot: "ما هي الإجراءات المتعلقة بالصفقات العمومية؟"
   - Chatbot searches knowledge base and responds

### For Production (Approach 2)

1. **Create Database Table:**
   ```bash
   psql -U user -d database -f migrations/create_procedures_table.sql
   ```

2. **Vectorize Procedures:**
   ```bash
   curl -X POST http://localhost:5000/api/chatbots/1/procedures/vectorize \
     -H "Content-Type: application/json" \
     -d @procedures.json
   ```

3. **Test Search:**
   ```bash
   curl "http://localhost:5000/api/chatbots/1/procedures/search?q=شهادة للمشاركة"
   ```

4. **Integrate with Chatbot:**
   - LangChain agent automatically uses `search_procedures` tool
   - Chatbot can search and retrieve procedures

---

## Optimizing the Vectorized Text

Your current `vectorizedText` is good, but here's how to optimize it:

### Current Format (Good)
```
الإجراء: [name]
التفاصيل الكاملة: [details]
المستندات المطلوبة: [documents]
المرجع القانوني: [references]
المدة الزمنية للمعالجة: [duration]
```

### Optimized Format (Better)
```typescript
function optimizeVectorizedText(proc: Procedure): string {
  return `
# ${proc.thematicTitle} - ${proc.subThematicTitle}

## معلومات الإجراء
- **الموضوع:** ${proc.thematicTitle}
- **الفئة الفرعية:** ${proc.subThematicTitle}
- **رقم الإجراء:** ${proc.procedureId}

## الوصف
${extractDescription(proc.vectorizedText)}

## المستندات المطلوبة
${extractDocuments(proc.vectorizedText)}

## المراجع القانونية
${extractLegalReferences(proc.vectorizedText)}

## مدة المعالجة
${extractProcessingTime(proc.vectorizedText)}

## الكلمات المفتاحية
${generateKeywords(proc)}
  `.trim();
}

function generateKeywords(proc: Procedure): string {
  const keywords = [
    proc.thematicTitle,
    proc.subThematicTitle,
    ...extractKeywordsFromText(proc.vectorizedText)
  ];
  return keywords.join(', ');
}
```

---

## Example: Complete Implementation

```typescript
// scripts/vectorize-procedures.ts
import * as fs from 'fs';
import { procedureVectorizationService } from '../server/services/procedure-vectorization';

async function main() {
  // Read procedures from JSON file
  const procedures = JSON.parse(
    fs.readFileSync('procedures.json', 'utf-8')
  );

  console.log(`📚 Found ${procedures.length} procedures`);

  // Chatbot ID (get from database or pass as argument)
  const chatbotId = parseInt(process.argv[2] || '1');

  console.log(`🤖 Vectorizing for chatbot ID: ${chatbotId}`);

  // Vectorize all procedures
  await procedureVectorizationService.vectorizeProcedures(
    chatbotId,
    procedures
  );

  console.log('✅ Vectorization complete!');

  // Test search
  console.log('\n🔍 Testing search...');
  const results = await procedureVectorizationService.searchProcedures(
    chatbotId,
    'شهادة للمشاركة في الصفقات العمومية',
    3
  );

  console.log(`Found ${results.length} results:`);
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.thematic_title}`);
    console.log(`   Similarity: ${(result.similarity * 100).toFixed(2)}%`);
  });
}

main().catch(console.error);
```

**Run it:**
```bash
npm run vectorize-procedures 1
```

---

## Testing the Chatbot

### Test Queries (Arabic)

1. **General Search:**
   - "ما هي الإجراءات المتعلقة بالصفقات العمومية؟"
   - "أريد معرفة الإجراءات الخاصة بالمقاولات"

2. **Specific Procedure:**
   - "كيف أحصل على شهادة للمشاركة في الصفقات العمومية؟"
   - "ما هي المستندات المطلوبة للصفقات العمومية؟"

3. **Legal References:**
   - "ما هي المراجع القانونية للصفقات العمومية؟"

### Expected Behavior

The chatbot should:
1. ✅ Understand Arabic queries
2. ✅ Search vectorized procedures
3. ✅ Return relevant procedures with details
4. ✅ Provide document requirements
5. ✅ Include legal references
6. ✅ Mention processing time

---

## Summary

### Quick Solution (5 minutes)
1. Convert JSON to text file
2. Upload to Knowledge Base tab
3. Done! Chatbot can search procedures

### Production Solution (1 hour)
1. Create procedures table with pgvector
2. Create vectorization service
3. Create API endpoints
4. Integrate with LangChain agent
5. Batch vectorize all procedures
6. Test and deploy

**Recommendation:** Start with Approach 1 (quick), then migrate to Approach 2 for production if you need advanced features like real-time updates, analytics, or custom search logic.
