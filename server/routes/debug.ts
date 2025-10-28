import { Router } from "express";
import { requireAdminAuth } from "../middleware/auth";
import { supabaseStorage as storage } from "../storage-supabase";

const router = Router();

// Test endpoint
router.get("/debug/test", async (req, res) => {
  res.json({ message: "Debug routes working!" });
});

// Debug endpoint to check knowledge base status (NO AUTH for debugging)
router.get("/debug/kb/:chatbotId", async (req, res) => {
  try {
    const { chatbotId } = req.params;
    
    // Get all documents for this chatbot
    const documents = await storage.getKBDocuments(chatbotId);
    
    // Get chunk counts and embedding status for each document
    const documentDetails = await Promise.all(
      documents.map(async (doc) => {
        const chunks = await storage.getKBChunks(doc.id);
        const chunksWithEmbeddings = chunks.filter(c => c.embedding !== null);
        
        return {
          id: doc.id,
          filename: doc.filename,
          status: doc.status,
          size: doc.size,
          createdAt: doc.createdAt,
          totalChunks: chunks.length,
          chunksWithEmbeddings: chunksWithEmbeddings.length,
          sampleChunk: chunks[0] ? {
            text: chunks[0].text.substring(0, 200) + '...',
            hasEmbedding: chunks[0].embedding !== null
          } : null
        };
      })
    );
    
    res.json({
      chatbotId,
      totalDocuments: documents.length,
      documents: documentDetails
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as debugRoutes };
