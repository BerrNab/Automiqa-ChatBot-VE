// Vercel serverless function entry point
import express from 'express';
import { authRoutes, configureAuth } from '../server/routes/auth.js';
import { adminDashboardRoutes } from '../server/routes/admin-dashboard.js';
import { clientRoutes } from '../server/routes/clients.js';
import { chatbotsRoutes } from '../server/routes/chatbots.js';
import { subscriptionRoutes } from '../server/routes/subscriptions.js';
import { widgetRoutes } from '../server/routes/widgets.js';
import { paymentRoutes } from '../server/routes/payments.js';
import { clientDashboardRoutes } from '../server/routes/client-dashboard.js';
import { knowledgeBaseRoutes } from '../server/routes/knowledge-base.js';
import { emailNotificationRoutes } from '../server/routes/email-notifications.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure auth
configureAuth(app);

// Register routes
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

// Export for Vercel
export default app;
