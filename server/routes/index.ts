import type { Express } from "express";
import { createServer, type Server } from "http";
import { authRoutes, configureAuth } from "./auth";
import { adminDashboardRoutes } from "./admin-dashboard";
import { clientRoutes } from "./clients";
import { chatbotRoutes } from "./chatbots";
import { subscriptionRoutes } from "./subscriptions";
import { widgetRoutes } from "./widgets";
import { paymentRoutes } from "./payments";
import { clientDashboardRoutes } from "./client-dashboard";
import { knowledgeBaseRoutes } from "./knowledge-base";
import { emailNotificationRoutes } from "./email-notifications";
import { debugRoutes } from "./debug";

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