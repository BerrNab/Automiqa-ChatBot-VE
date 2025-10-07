import { supabaseStorage as storage } from "../storage-supabase";
import { kbService } from "../services/knowledge-base";
import { supabaseService } from "../services/supabase";
import { openaiService } from "../services/openai";
import { nanoid } from "nanoid";

export class KnowledgeBaseService {
  /**
   * Upload document to knowledge base
   */
  async uploadDocument(chatbotId: string, file: Express.Multer.File) {
    try {
      // Check if chatbot exists
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot) {
        throw new Error("Chatbot not found");
      }

      // Validate file
      kbService.validateFile(file.buffer, file.mimetype);
      
      // Calculate checksum
      const checksum = kbService.calculateChecksum(file.buffer);
      
      // Check if document already exists - if so, delete it first (override behavior)
      const existingDoc = await storage.getDocumentByChecksum(chatbotId, checksum);
      if (existingDoc) {
        console.log(`Document with same checksum exists (${existingDoc.id}), deleting old version...`);
        try {
          // Delete old document and its chunks
          if (supabaseService.isAvailable()) {
            await supabaseService.deleteKBDocument(existingDoc.storagePath);
          }
          await storage.deleteKBDocument(existingDoc.id);
        } catch (error) {
          console.error("Failed to delete existing document:", error);
          // Continue with upload even if deletion fails
        }
      }

      // Upload to Supabase storage
      const storagePath = await supabaseService.uploadKBDocument(
        chatbotId, 
        file.buffer, 
        file.originalname, 
        file.mimetype
      );

      // Create document record
      const document = await storage.createKBDocument({
        id: nanoid(),
        chatbotId,
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        storagePath,
        checksum,
        status: "processing"
      });

      // Process document asynchronously
      this.processDocumentAsync(document.id, file.buffer, file.mimetype, file.originalname);
      
      return {
        id: document.id,
        filename: file.originalname,
        size: file.size,
        status: "processing",
        message: "Document uploaded successfully and is being processed"
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process document asynchronously - extract text, chunk, and create embeddings
   */
  private async processDocumentAsync(documentId: string, buffer: Buffer, contentType: string, filename: string) {
    try {
      // Extract text from document
      const text = await kbService.extractText(buffer, contentType, filename);
      
      // Chunk the text
      const chunks = await kbService.chunkText(text);
      
      // Get document to update
      const document = await storage.getKBDocument(documentId);
      if (!document) {
        throw new Error("Document not found during processing");
      }

      // Create embeddings and store chunks
      const chunkPromises = chunks.map(async (chunkText, index) => {
        try {
          // Create embedding using OpenAI
          const embedding = await openaiService.createEmbedding(chunkText);
          
          // Store chunk with embedding
          await storage.createKBChunk({
            id: nanoid(),
            documentId,
            chatbotId: document.chatbotId,
            chunkIndex: index,
            text: chunkText,
            tokenCount: kbService.countTokens(chunkText),
            embedding: embedding, // This will be stored as vector in PostgreSQL
            metadata: {
              filename,
              contentType,
              extractedAt: new Date().toISOString()
            }
          });
        } catch (error) {
          console.error(`Failed to process chunk ${index} for document ${documentId}:`, error);
          throw error;
        }
      });

      // Wait for all chunks to be processed
      await Promise.all(chunkPromises);
      
      // Update document status to ready
      await storage.updateKBDocumentStatus(documentId, "ready");
      
      console.log(`Document ${documentId} processed successfully with ${chunks.length} chunks`);
    } catch (error: any) {
      console.error(`Failed to process document ${documentId}:`, error);
      
      // Update document status to error
      await storage.updateKBDocumentStatus(documentId, "error", error.message);
    }
  }

  /**
   * Get all documents for a chatbot
   */
  async getDocuments(chatbotId: string) {
    try {
      // Check if chatbot exists
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot) {
        throw new Error("Chatbot not found");
      }

      const documents = await storage.getKBDocuments(chatbotId);
      return documents;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a document from knowledge base
   */
  async deleteDocument(chatbotId: string, documentId: string) {
    try {
      // Check if chatbot exists
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot) {
        throw new Error("Chatbot not found");
      }

      // Get document details
      const document = await storage.getKBDocument(documentId);
      if (!document) {
        throw new Error("Document not found");
      }

      // Handle both camelCase and snake_case from database
      const docChatbotId = (document as any).chatbot_id || document.chatbotId;
      if (docChatbotId !== chatbotId) {
        throw new Error("Document does not belong to this chatbot");
      }

      // Delete from Supabase storage
      if (supabaseService.isAvailable()) {
        try {
          await supabaseService.deleteKBDocument(document.storagePath);
        } catch (error) {
          console.error("Failed to delete document from storage:", error);
        }
      }

      // Delete from database (this will cascade delete chunks)
      await storage.deleteKBDocument(documentId);
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search knowledge base for relevant chunks
   */
  async searchKnowledgeBase(chatbotId: string, query: string, limit = 5): Promise<Array<{
    text: string;
    similarity: number;
    filename: string;
    metadata: any;
  }>> {
    try {
      // Create embedding for the search query
      const queryEmbedding = await openaiService.createEmbedding(query);
      
      // Search for similar chunks
      const results = await storage.searchKBChunks(chatbotId, queryEmbedding, limit);
      
      return results;
    } catch (error: any) {
      console.error("Knowledge base search failed:", error);
      return [];
    }
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();