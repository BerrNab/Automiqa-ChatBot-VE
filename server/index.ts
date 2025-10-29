import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import config, { validateEnv } from "./config";

// Simple logger
const log = (message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [express] ${message}`);
};
import { supabaseStorage as storage } from "./storage-supabase";
import { authRoutes, configureAuth } from "./routes/auth";
import { adminDashboardRoutes } from "./routes/admin-dashboard";
import { clientRoutes } from "./routes/clients";
import { chatbotsRoutes } from "./routes/chatbots";
import { subscriptionRoutes } from "./routes/subscriptions";
import { widgetRoutes } from "./routes/widgets";
import { paymentRoutes } from "./routes/payments";
import { clientDashboardRoutes } from "./routes/client-dashboard";
import { knowledgeBaseRoutes } from "./routes/knowledge-base";
import { emailNotificationRoutes } from "./routes/email-notifications";

// Validate environment variables
validateEnv();

const app = express();

// CORS middleware for separate frontend deployment
app.use((req, res, next) => {
  // const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.header('Access-Control-Allow-Origin', "*");
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Setup app function for both local and serverless
export async function setupApp() {
  // Configure authentication and session middleware first
  configureAuth(app);

  // Register API routes BEFORE Vite middleware
  app.use("/api", authRoutes);
  app.use("/api", adminDashboardRoutes);
  app.use("/api", clientRoutes);
  app.use("/api", chatbotsRoutes);
  app.use("/api", subscriptionRoutes);
  app.use("/api", widgetRoutes);
  app.use("/api", paymentRoutes);
  app.use("/api", clientDashboardRoutes);
  app.use("/api", knowledgeBaseRoutes);
  app.use("/api/email-notifications", emailNotificationRoutes);

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  return app;
}

// Export app for Vercel
export { app };

// Only run server if not in Vercel environment
if (process.env.VERCEL !== '1') {
  (async () => {
    // Create HTTP server
    const server = createServer(app);

    await setupApp();

    // Start server
    const port = config.port;
    server.listen(port, "0.0.0.0", () => {
      log(`API server running on http://localhost:${port}`);
    });
  })();
}
