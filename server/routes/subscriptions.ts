import { Router } from "express";
import { requireAdminAuth } from "../middleware/auth";
import { subscriptionService } from "../application/subscriptionService";
import { insertSubscriptionSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

const router = Router();

// Get all subscriptions with optional status filter
router.get("/subscriptions", requireAdminAuth, async (req, res) => {
  try {
    const statusFilter = req.query.status as string;
    const subscriptions = await subscriptionService.getSubscriptionsWithClients(statusFilter);
    res.json(subscriptions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create new subscription for a client
router.post("/subscriptions", requireAdminAuth, async (req, res) => {
  try {
    // Validate request body with Zod schema
    const validationResult = insertSubscriptionSchema.safeParse(req.body);
    if (!validationResult.success) {
      const validationError = fromZodError(validationResult.error);
      return res.status(400).json({ 
        message: "Validation failed",
        errors: validationError.toString()
      });
    }

    const subscription = await subscriptionService.createSubscription(validationResult.data);
    res.json(subscription);
  } catch (error: any) {
    // Handle storage/business logic errors  
    if (error.message.includes("not found") || error.message.includes("already exists")) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

// Process subscription actions (convert, extend, suspend, reactivate)
router.patch("/subscriptions/:id/:action", requireAdminAuth, async (req, res) => {
  try {
    const { id, action } = req.params;
    const data = req.body;
    
    const result = await subscriptionService.processSubscriptionAction(id, action, data);
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export { router as subscriptionRoutes };