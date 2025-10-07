import { Router } from "express";
import express from "express";
import { requireAdminAuth } from "../middleware/auth";
import { paymentService } from "../application/paymentService";

const router = Router();

// Get payment statistics
router.get("/admin/payments/stats", requireAdminAuth, async (req, res) => {
  try {
    const stats = await paymentService.getPaymentStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get all payments with optional filters
router.get("/admin/payments", requireAdminAuth, async (req, res) => {
  try {
    const statusFilter = req.query.status as string;
    const dateFilter = req.query.date as string;
    const payments = await paymentService.getPaymentsWithClients(statusFilter, dateFilter);
    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Retry a payment
router.post("/admin/payments/:id/retry", requireAdminAuth, async (req, res) => {
  try {
    const result = await paymentService.retryPayment(req.params.id);
    res.json(result);
  } catch (error: any) {
    if (error.message === "Payment not found") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Payment webhook endpoint
router.post("/payment/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const result = await paymentService.processPaymentWebhook(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).json({ message: 'Webhook processing failed' });
  }
});

export { router as paymentRoutes };