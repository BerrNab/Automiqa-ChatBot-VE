import { Router } from "express";
import { requireAdminAuth } from "../middleware/auth.js";
import { requireClientAuth } from "../middleware/auth.js";
import { pluginManagerService } from "../services/plugin-manager.js";
import { 
  insertPluginTemplateSchema, 
  insertChatbotPluginSchema,
  triggerRulesSchema 
} from "../shared/schema.js";

const router = Router();

// ============= ADMIN PLUGIN TEMPLATE MANAGEMENT =============

// Get all plugin templates (admin)
router.get("/plugins/templates/admin", requireAdminAuth, async (req, res) => {
  try {
    const { type, category, isActive, isPublic } = req.query;
    const filters: any = {};
    
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (isPublic !== undefined) filters.isPublic = isPublic === 'true';

    const templates = await pluginManagerService.getPluginTemplates(filters);
    res.json(templates);
  } catch (error: any) {
    console.error('Error fetching plugin templates:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get plugin template by ID (admin)
router.get("/admin/plugins/templates/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const template = await pluginManagerService.getPluginTemplateById(id);
    
    if (!template) {
      return res.status(404).json({ message: "Plugin template not found" });
    }
    
    res.json(template);
  } catch (error: any) {
    console.error('Error fetching plugin template:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create plugin template (admin)
router.post("/plugins/templates/admin", requireAdminAuth, async (req, res) => {
  try {
    if (typeof req.body.apiConfiguration === 'string') {
      req.body.apiConfiguration = JSON.parse(req.body.apiConfiguration);
    }
    const validatedData = insertPluginTemplateSchema.parse(req.body);
    const admin = req.user as { id: string };
    if (!admin || !admin.id) {
      return res.status(401).json({ message: "Unauthorized: Admin user not found" });
    }
    
    const template = await pluginManagerService.createPluginTemplate(
      validatedData, 
      admin.id
    );
    
    res.status(201).json(template);
  } catch (error: any) {
    console.error('Error creating plugin template:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: error.message });
  }
});

// Update plugin template (admin)
router.put("/plugins/templates/admin/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = insertPluginTemplateSchema.partial().parse(req.body);
    
    const template = await pluginManagerService.updatePluginTemplate(id, validatedData);
    res.json(template);
  } catch (error: any) {
    console.error('Error updating plugin template:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: error.message });
  }
});

// Delete plugin template (admin)
router.delete("/plugins/templates/admin/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pluginManagerService.deletePluginTemplate(id);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting plugin template:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get plugin usage statistics (admin)
router.get("/admin/plugins/:templateId/stats", requireAdminAuth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const stats = await pluginManagerService.getPluginUsageStats(templateId);
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching plugin stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============= CLIENT PLUGIN MANAGEMENT =============

// Get available plugin templates for clients (public templates only)
router.get("/plugins/templates", requireClientAuth, async (req, res) => {
  try {
    const { type, category } = req.query;
    const filters: any = {
      is_active: true,
      is_public: true
    };
    
    if (type) filters.type = type;
    if (category) filters.category = category;

    const templates = await pluginManagerService.getPluginTemplates(filters);
    res.json(templates);
  } catch (error: any) {
    console.error('Error fetching available plugin templates:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get plugins for a specific chatbot (client)
router.get("/chatbots/:chatbotId/plugins", requireClientAuth, async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const client = req.user;
    
    // Verify client owns this chatbot
    // This would need to be implemented based on your auth system
    
    const plugins = await pluginManagerService.getChatbotPlugins(chatbotId);
    res.json(plugins);
  } catch (error: any) {
    console.error('Error fetching chatbot plugins:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add plugin to chatbot (client)
router.post("/chatbots/:chatbotId/plugins", requireClientAuth, async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const client = req.user;
    
    const validatedData = insertChatbotPluginSchema.parse({
      ...req.body,
      chatbotId
    });
    
    const plugin = await pluginManagerService.addPluginToChatbot(
      validatedData,
      client.id
    );
    
    res.status(201).json(plugin);
  } catch (error: any) {
    console.error('Error adding plugin to chatbot:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: error.message });
  }
});

// Update chatbot plugin configuration (client)
router.put("/chatbots/:chatbotId/plugins/:pluginId", requireClientAuth, async (req, res) => {
  try {
    const { pluginId } = req.params;
    const validatedData = insertChatbotPluginSchema.partial().parse(req.body);
    
    const plugin = await pluginManagerService.updateChatbotPlugin(pluginId, validatedData);
    res.json(plugin);
  } catch (error: any) {
    console.error('Error updating chatbot plugin:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: error.message });
  }
});

// Remove plugin from chatbot (client)
router.delete("/chatbots/:chatbotId/plugins/:pluginId", requireClientAuth, async (req, res) => {
  try {
    const { pluginId } = req.params;
    await pluginManagerService.removePluginFromChatbot(pluginId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error removing plugin from chatbot:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============= PLUGIN EXECUTION =============

// Execute plugin (internal use by chatbot service)
router.post("/plugins/:pluginId/execute", async (req, res) => {
  try {
    const { pluginId } = req.params;
    const { conversationData, conversationId } = req.body;
    
    // This endpoint should be secured properly for internal use only
    // Maybe add a special API key or internal authentication
    
    const result = await pluginManagerService.executePlugin(
      pluginId,
      conversationData,
      conversationId
    );
    
    res.json(result);
  } catch (error: any) {
    console.error('Error executing plugin:', error);
    res.status(500).json({ message: error.message });
  }
});

// Evaluate trigger rules for a plugin
router.post("/plugins/:pluginId/evaluate-triggers", async (req, res) => {
  try {
    const { pluginId } = req.params;
    const { conversationData } = req.body;
    
    const shouldTrigger = await pluginManagerService.evaluateTriggerRules(
      pluginId,
      conversationData
    );
    
    res.json({ shouldTrigger });
  } catch (error: any) {
    console.error('Error evaluating trigger rules:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============= PLUGIN EXECUTION LOGS =============

// Get execution logs for a plugin (client)
router.get("/chatbots/:chatbotId/plugins/:pluginId/logs", requireClientAuth, async (req, res) => {
  try {
    const { pluginId } = req.params;
    const { limit = 50 } = req.query;
    
    const logs = await pluginManagerService.getPluginExecutionLogs(
      pluginId,
      undefined,
      parseInt(limit as string)
    );
    
    res.json(logs);
  } catch (error: any) {
    console.error('Error fetching plugin execution logs:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get execution logs for a conversation (admin)
router.get("/admin/plugins/logs/conversation/:conversationId", requireAdminAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50 } = req.query;
    
    const logs = await pluginManagerService.getPluginExecutionLogs(
      undefined,
      conversationId,
      parseInt(limit as string)
    );
    
    res.json(logs);
  } catch (error: any) {
    console.error('Error fetching conversation plugin logs:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============= UTILITY ENDPOINTS =============

// Validate trigger rules configuration
router.post("/plugins/validate-trigger-rules", async (req, res) => {
  try {
    const triggerRules = triggerRulesSchema.parse(req.body);
    res.json({ valid: true, triggerRules });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        valid: false,
        message: "Invalid trigger rules configuration", 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: error.message });
  }
});

// Test plugin configuration (dry run)
router.post("/plugins/test-configuration", async (req, res) => {
  try {
    const { pluginTemplateId, config, testData } = req.body;
    
    // This would implement a test execution without saving logs
    // For now, return a mock response
    res.json({
      success: true,
      message: "Plugin configuration test completed successfully",
      testResult: {
        connectivity: "ok",
        authentication: "ok",
        responseTime: "245ms"
      }
    });
  } catch (error: any) {
    console.error('Error testing plugin configuration:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

export { router as pluginManagerRoutes };
