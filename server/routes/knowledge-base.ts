import { Router } from "express";
import multer from "multer";
import { requireAdminAuth } from "../middleware/auth";
import { knowledgeBaseService } from "../application/knowledgeBaseService";

const router = Router();

// Configure multer for document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log(file);
    // Accept PDF, DOC, DOCX, and TXT files
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/json'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, and JSON files are allowed.'));
    }
  },
});

// Upload document to knowledge base
router.post("/admin/chatbots/:chatbotId/kb/upload", requireAdminAuth, upload.single('document'), async (req, res) => {
  try {
    const { chatbotId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await knowledgeBaseService.uploadDocument(chatbotId, req.file);
    res.json(result);
  } catch (error: any) {
    console.error("Document upload error:", error);
    if (error.message === "Chatbot not found") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ 
      message: error.message || "Failed to upload document",
    });
  }
});

// Get all documents for a chatbot
router.get("/admin/chatbots/:chatbotId/kb/documents", requireAdminAuth, async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const documents = await knowledgeBaseService.getDocuments(chatbotId);
    res.json(documents);
  } catch (error: any) {
    if (error.message === "Chatbot not found") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Get single document status with progress (for polling during processing)
router.get("/admin/chatbots/:chatbotId/kb/documents/:documentId", requireAdminAuth, async (req, res) => {
  try {
    const { chatbotId, documentId } = req.params;
    const document = await knowledgeBaseService.getDocumentStatus(chatbotId, documentId);
    
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    res.json(document);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a document from knowledge base
router.delete("/admin/chatbots/:chatbotId/kb/documents/:documentId", requireAdminAuth, async (req, res) => {
  try {
    const { chatbotId, documentId } = req.params;
    const result = await knowledgeBaseService.deleteDocument(chatbotId, documentId);
    res.json({ message: "Document deleted successfully" });
  } catch (error: any) {
    console.error("Document delete error:", error);
    if (error.message === "Chatbot not found") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ 
      message: error.message || "Failed to delete document",
    });
  }
});

export { router as knowledgeBaseRoutes };