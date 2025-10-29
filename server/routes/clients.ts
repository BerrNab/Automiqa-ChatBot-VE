import { Router } from "express";
import { requireAdminAuth } from "../middleware/auth.js";
import { clientService } from "../application/clientService.js";

const router = Router();

// Get all clients with their chatbots
router.get("/clients", requireAdminAuth, async (req, res) => {
  try {
    const clients = await clientService.getClientsWithChatbots();
    res.json(clients);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new client
router.post("/clients", requireAdminAuth, async (req, res) => {
  try {
    const client = await clientService.createClient(req.body);
    res.json(client);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update a client
router.put("/clients/:id", requireAdminAuth, async (req, res) => {
  try {
    const client = await clientService.updateClient(req.params.id, req.body);
    res.json(client);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a client
router.delete("/clients/:id", requireAdminAuth, async (req, res) => {
  try {
    await clientService.deleteClient(req.params.id);
    res.json({ message: "Client deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Set client credentials for portal access
router.post("/clients/:clientId/credentials", requireAdminAuth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { clientCredentialsSchema } = await import("server/shared/schema");
    
    // Validate request body
    const validatedData = clientCredentialsSchema.parse(req.body);
    const { authEmail, password } = validatedData;
    
    const result = await clientService.setClientCredentials(clientId, authEmail, password);
    
    res.json({ 
      message: "Client credentials generated successfully",
      authEmail: result.authEmail,
      portalUrl: `${req.protocol}://${req.get('host')}/client/login`
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: error.message });
  }
});

// Revoke client portal access
router.delete("/clients/:clientId/credentials", requireAdminAuth, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    await clientService.revokeClientCredentials(clientId);
    
    res.json({ message: "Client portal access revoked successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get client portal status
router.get("/clients/:clientId/portal-status", requireAdminAuth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    const status = await clientService.getClientPortalStatus(clientId, baseUrl);
    
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export { router as clientRoutes };