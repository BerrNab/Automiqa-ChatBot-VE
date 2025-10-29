import type { Express } from "express";
import { createServer, type Server } from "http";
import { authRoutes, configureAuth } from "./auth.js";
import { adminDashboardRoutes } from "./admin-dashboard.js";
import { clientRoutes } from "./clients.js";
import { chatbotRoutes } from "./chatbots.js";
import { subscriptionRoutes } from "./subscriptions.js";
import { widgetRoutes } from "./widgets.js";
import { paymentRoutes } from "./payments.js";
import { clientDashboardRoutes } from "./client-dashboard.js";
import { knowledgeBaseRoutes } from "./knowledge-base.js";
import { emailNotificationRoutes } from "./email-notifications.js";
import { debugRoutes } from "./debug.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure authentication and session middleware first
  configureAuth(app);

  // Register all route modules with /api prefix
  app.use("/api", authRoutes);
  app.use("/api", adminDashboardRoutes);
  app.use("/api", clientRoutes);
  app.use("/api", chatbotRoutes);
  app.use("/api", subscriptionRoutes);
  app.use("/api", widgetRoutes);
  app.use("/api", paymentRoutes);
  app.use("/api", clientDashboardRoutes);
  app.use("/api", knowledgeBaseRoutes);
  app.use("/api", debugRoutes);
  app.use("/api/email-notifications", emailNotificationRoutes);


  // Create HTTP server
  const server = createServer(app);
  
  return server;
}