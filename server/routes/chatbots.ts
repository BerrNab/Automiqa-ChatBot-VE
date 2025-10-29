import { Router } from "express";
import multer from "multer";
import { requireAdminAuth } from "../middleware/auth.js";
import { chatbotService } from "../application/chatbotService.js";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, SVG, WebP) are allowed.'));
    }
  },
});

// Get all chatbots
router.get("/chatbots", requireAdminAuth, async (req, res) => {
  try {
    const chatbots = await chatbotService.getChatbotsWithClients();
    res.json(chatbots);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single chatbot by ID
router.get("/chatbots/:id", requireAdminAuth, async (req, res) => {
  try {
    const chatbot = await chatbotService.getChatbot(req.params.id);
    if (!chatbot) {
      return res.status(404).json({ message: `Chatbot with ID ${req.params.id} not found` });
    }
    res.json(chatbot);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new chatbot
router.post("/chatbots", requireAdminAuth, async (req, res) => {
  try {
    const chatbot = await chatbotService.createChatbot(req.body);
    res.json(chatbot);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update chatbot status
router.patch("/chatbots/:id/status", requireAdminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const chatbot = await chatbotService.updateChatbotStatus(req.params.id, status);
    res.json(chatbot);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update chatbot configuration
router.patch("/chatbots/:id/config", requireAdminAuth, async (req, res) => {
  try {
    const { config } = req.body;
    const chatbot = await chatbotService.updateChatbotConfig(req.params.id, config);
    res.json(chatbot);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update entire chatbot
router.put("/chatbots/:id", requireAdminAuth, async (req, res) => {
  try {
    // First check if the chatbot exists
    const existingChatbot = await chatbotService.getChatbot(req.params.id);
    if (!existingChatbot) {
      return res.status(404).json({ message: `Chatbot with ID ${req.params.id} not found` });
    }
    
    // Update the chatbot
    // For now, we'll just update the config, name, and description
    // You can expand this to update other fields as needed
    const { name, description, config } = req.body;
    
    // Update name and description if provided
    if (name !== undefined || description !== undefined) {
      await chatbotService.updateChatbotDetails(req.params.id, { name, description });
    }
    
    // Update config if provided
    if (config) {
      await chatbotService.updateChatbotConfig(req.params.id, config);
    }
    
    // Get the updated chatbot
    const updatedChatbot = await chatbotService.getChatbot(req.params.id);
    res.json(updatedChatbot);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Upload logo
router.post("/chatbots/:chatbotId/logo", requireAdminAuth, upload.single('logo'), async (req, res) => {
  try {
    const { chatbotId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await chatbotService.uploadLogo(chatbotId, req.file);
    res.json(result);
  } catch (error: any) {
    console.error("Logo upload error:", error);
    res.status(500).json({ 
      message: error.message || "Failed to upload logo",
    });
  }
});

// Delete logo
router.delete("/chatbots/:chatbotId/logo", requireAdminAuth, async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const result = await chatbotService.deleteLogo(chatbotId);
    res.json(result);
  } catch (error: any) {
    console.error("Logo delete error:", error);
    res.status(500).json({ 
      message: error.message || "Failed to delete background image",
    });
  }
});

// Upload background image
router.post("/chatbots/:chatbotId/background", requireAdminAuth, upload.single('backgroundImage'), async (req, res) => {
  try {
    const { chatbotId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await chatbotService.uploadBackgroundImage(chatbotId, req.file);
    res.json(result);
  } catch (error: any) {
    console.error("Background image upload error:", error);
    res.status(500).json({ 
      message: error.message || "Failed to upload background image",
    });
  }
});

// Delete background image
router.delete("/chatbots/:chatbotId/background", requireAdminAuth, async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const result = await chatbotService.deleteBackgroundImage(chatbotId);
    res.json(result);
  } catch (error: any) {
    console.error("Background image delete error:", error);
    res.status(500).json({ 
      message: error.message || "Failed to delete background image",
    });
  }
});

export { router as chatbotsRoutes };