import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import config, { validateEnv } from "./config.js";
import { supabaseStorage as storage } from "./storage-supabase.js";
import { authRoutes, configureAuth } from "./routes/auth.js";
import { adminDashboardRoutes } from "./routes/admin-dashboard.js";
import { clientRoutes } from "./routes/clients.js";
import { chatbotsRoutes } from "./routes/chatbots.js";
import { subscriptionRoutes } from "./routes/subscriptions.js";
import { widgetRoutes } from "./routes/widgets.js";
import { paymentRoutes } from "./routes/payments.js";
import { clientDashboardRoutes } from "./routes/client-dashboard.js";
import { knowledgeBaseRoutes } from "./routes/knowledge-base.js";
import { emailNotificationRoutes } from "./routes/email-notifications.js";

// Simple logger
const log = (message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [express] ${message}`);
};
// Validate environment variables
validateEnv();

const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://automiqa-chat-bot-ve-3z7o.vercel.app',
    'http://automiqa-chat-bot-ve-3z7o.vercel.app'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  
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
  // Health check endpoint (no auth required)
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  });

  // Configure authentication (Passport strategies)
  configureAuth(app);
  
  // Register API routes
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

// Initialize app for Vercel
await setupApp();

// Export for Vercel serverless
export default app;

// Only start server if not in Vercel environment
if (!process.env.VERCEL) {
  const server = createServer(app);
  const port = config.port;
  server.listen(port, () => {
    log(`API server running on http://localhost:${port}`);
  });
}
