# SaaSOps Frontend

React + Vite frontend for the SaaSOps chatbot platform.

## Quick Start

### Local Development
```bash
npm install
echo "VITE_API_URL=http://localhost:5000" > .env.local
npm run dev
```

App runs on: `http://localhost:3000`

### Build for Production
```bash
npm run build
npm run preview
```

## Environment Variables

Create `.env.local` for development:
```bash
VITE_API_URL=http://localhost:5000
```

For production (Vercel), set:
```bash
VITE_API_URL=https://your-backend.up.railway.app
```

## Deployment

### Vercel (Recommended)
1. Connect GitHub repository
2. Set root directory to `/client`
3. Framework: Vite
4. Add `VITE_API_URL` environment variable
5. Deploy

See `../DEPLOYMENT_GUIDE.md` for detailed instructions.

## Project Structure

```
client/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── lib/            # Utilities and helpers
│   └── App.tsx         # Main app component
├── public/             # Static assets
├── vite.config.ts      # Vite configuration
└── package.json        # Dependencies
```

## Key Features

- **Admin Dashboard** - Manage chatbots and clients
- **Client Dashboard** - Client portal
- **Widget Preview** - Test chatbot widgets
- **Analytics** - View chatbot performance
- **Knowledge Base** - Upload and manage documents

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Type check

## Tech Stack

- React 18
- TypeScript
- Vite
- TailwindCSS
- Radix UI
- React Query
- Wouter (routing)
