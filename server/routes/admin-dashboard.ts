import { Router } from "express";
import { requireAdminAuth } from "../middleware/auth";
import { adminService } from "../application/adminService";

const router = Router();

// Dashboard Statistics
router.get("/dashboard/stats", requireAdminAuth, async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Recent Activities
router.get("/dashboard/activities", requireAdminAuth, async (req, res) => {
  try {
    const activities = await adminService.getRecentActivities();
    res.json(activities);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Subscription Status Overview
router.get("/dashboard/subscription-status", requireAdminAuth, async (req, res) => {
  try {
    const subscriptionStatus = await adminService.getSubscriptionStatus();
    res.json(subscriptionStatus);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export { router as adminDashboardRoutes };