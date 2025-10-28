// Vercel serverless function entry point
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import your Express app setup
// Note: We need to refactor server/index.ts to export the app
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();

// Import all your routes and middleware
// This is a placeholder - you'll need to import your actual server setup
import('../server/index.js').then(() => {
  console.log('Server initialized');
}).catch(err => {
  console.error('Failed to initialize server:', err);
});

// Export for Vercel
export default app;
