// Vercel serverless function entry point
import { app, setupApp } from '../server/index.js';

// Initialize app routes
let isInitialized = false;

async function initializeApp() {
  if (!isInitialized) {
    await setupApp();
    isInitialized = true;
  }
  return app;
}

// Export handler for Vercel
export default async function handler(req: any, res: any) {
  const app = await initializeApp();
  return app(req, res);
}
