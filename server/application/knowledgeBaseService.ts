import { supabaseStorage as storage } from "../storage-supabase.js";
import { kbService, type ChunkingStrategy } from "../services/knowledge-base.js";
import { supabaseService } from "../services/supabase.js";
import { openaiService } from "../services/openai.js";
import { embeddingService, type EmbeddingConfig } from "../services/embedding-service.js";
import { nanoid } from "nanoid";
import type { ChatbotConfig } from "../shared/schema.js";

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

      // Get chatbot config for embedding and chunking settings
      const config = chatbot.config as ChatbotConfig;

      // Process document asynchronously with config-based settings
      this.processDocumentAsync(
        document.id, 
        file.buffer, 
        file.mimetype, 
        file.originalname,
        config
      );
      
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
   * Now uses file-type-specific processing and configurable embedding models
   */
  private async processDocumentAsync(
    documentId: string, 
    buffer: Buffer, 
    contentType: string, 
    filename: string,
    chatbotConfig?: ChatbotConfig
  ) {
    try {
      // Get document to update
      const document = await storage.getKBDocument(documentId);
      if (!document) {
        throw new Error("Document not found during processing");
      }

      // Extract chunking strategy from config
      const chunkingStrategy = chatbotConfig?.knowledgeBase?.chunkingStrategy as ChunkingStrategy | undefined;
      
      // Extract embedding config from chatbot settings
      const embeddingConfig: EmbeddingConfig = {
        model: (chatbotConfig?.knowledgeBase?.embeddingModel as any) || "text-embedding-3-large",
        dimensions: chatbotConfig?.knowledgeBase?.embeddingDimensions || 1536,
      };

      console.log(`[KnowledgeBase] Processing ${filename} with:`);
      console.log(`  - Embedding model: ${embeddingConfig.model}`);
      console.log(`  - Dimensions: ${embeddingConfig.dimensions}`);
      console.log(`  - Content type: ${contentType}`);

      // Use the new file-type-specific document processor
      const processingResult = await kbService.processDocument(
        buffer, 
        contentType, 
        filename,
        chunkingStrategy
      );

      const chunks = processingResult.chunks;
      const totalChunks = chunks.length;
      let processedChunks = 0;

      // Process chunks in batches to avoid overwhelming the database and API
      const BATCH_SIZE = 5;
      const DELAY_BETWEEN_BATCHES = 1000;
      
      console.log(`[KnowledgeBase] Processing ${totalChunks} chunks (${processingResult.fileType}) in batches of ${BATCH_SIZE}...`);
      
      // Update document with total chunks count
      await storage.updateKBDocumentProgress(documentId, 0, totalChunks);
      
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (chunk, batchIndex) => {
          const index = i + batchIndex;
          let retries = 3;
          
          while (retries > 0) {
            try {
              // Create embedding using the configured model
              const embedding = await embeddingService.createEmbedding(
                chunk.text,
                embeddingConfig
              );
              
              // Store chunk with embedding and enhanced metadata
              await storage.createKBChunk({
                id: nanoid(),
                documentId,
                chatbotId: document.chatbotId,
                chunkIndex: index,
                text: chunk.text,
                tokenCount: kbService.countTokens(chunk.text),
                embedding: embedding,
                metadata: {
                  filename,
                  contentType,
                  fileType: processingResult.fileType,
                  embeddingModel: embeddingConfig.model,
                  embeddingDimensions: embeddingConfig.dimensions,
                  extractedAt: new Date().toISOString(),
                  // Include chunk-specific metadata from processor
                  ...chunk.metadata,
                }
              });
              
              processedChunks++;
              
              // Update progress every batch
              if (processedChunks % BATCH_SIZE === 0 || processedChunks === totalChunks) {
                await storage.updateKBDocumentProgress(documentId, processedChunks, totalChunks);
                console.log(`[KnowledgeBase] Progress: ${processedChunks}/${totalChunks} chunks (${Math.round(processedChunks/totalChunks*100)}%)`);
              }
              
              break; // Success, exit retry loop
            } catch (error: any) {
              retries--;
              
              // Check for rate limit or network errors
              const isRateLimitError = error.status === 429 || error.status === 403;
              const isFetchError = error.message?.includes('fetch failed');

              if ((isRateLimitError || isFetchError) && retries > 0) {
                const waitTime = (4 - retries) * 5000;
                console.log(`[KnowledgeBase] Rate limit for chunk ${index}, retrying in ${waitTime/1000}s... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
              } else {
                console.error(`[KnowledgeBase] Failed to process chunk ${index}:`, error);
                throw error;
              }
            }
          }
        });
        
        // Wait for current batch to complete before starting next batch
        await Promise.all(batchPromises);
        
        // Add delay between batches to avoid rate limits
        if (i + BATCH_SIZE < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }
      
      console.log(`[KnowledgeBase] Document ${documentId} processed successfully:`);
      console.log(`  - ${totalChunks} chunks created`);
      console.log(`  - ~${processingResult.totalTokens} tokens`);
      console.log(`  - File type: ${processingResult.fileType}`);
      
      // Update document status to ready
      await storage.updateKBDocumentStatus(documentId, "ready");
    } catch (error: any) {
      console.error(`[KnowledgeBase] Failed to process document ${documentId}:`, error);
      
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
   * Get single document status with progress (for polling)
   */
  async getDocumentStatus(chatbotId: string, documentId: string) {
    try {
      // Check if chatbot exists
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot) {
        throw new Error("Chatbot not found");
      }

      const document = await storage.getKBDocument(documentId);
      if (!document) {
        return null;
      }

      // Verify document belongs to chatbot
      const docChatbotId = (document as any).chatbot_id || document.chatbotId;
      if (docChatbotId !== chatbotId) {
        throw new Error("Document does not belong to this chatbot");
      }

      return document;
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
   * Uses the same embedding model that was used to create the chunks
   */
  async searchKnowledgeBase(
    chatbotId: string, 
    query: string, 
    limit = 5,
    embeddingConfig?: EmbeddingConfig
  ): Promise<Array<{
    text: string;
    similarity: number;
    filename: string;
    metadata: any;
  }>> {
    try {
      // If no config provided, try to get it from chatbot
      let config = embeddingConfig;
      if (!config) {
        const chatbot = await storage.getChatbot(chatbotId);
        if (chatbot) {
          const chatbotConfig = chatbot.config as ChatbotConfig;
          config = {
            model: (chatbotConfig?.knowledgeBase?.embeddingModel as any) || "text-embedding-3-large",
            dimensions: chatbotConfig?.knowledgeBase?.embeddingDimensions || 1536,
          };
        }
      }

      // Create embedding for the search query using the same model
      const queryEmbedding = await embeddingService.createEmbedding(
        query,
        config
      );
      
      // Search for similar chunks
      const results = await storage.searchKBChunks(chatbotId, queryEmbedding, limit);
      
      return results;
    } catch (error: any) {
      console.error("Knowledge base search failed:", error);
      return [];
    }
  }

  /**
   * Get supported file types for knowledge base
   */
  getSupportedFileTypes(): string[] {
    return kbService.getSupportedTypes();
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();