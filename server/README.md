# SaaSOps Backend

Express.js API server for the SaaSOps chatbot platform.

## Quick Start

### Local Development
```bash
npm install
cp env.example .env
# Edit .env with your credentials
npm run dev
```

Server runs on: `http://localhost:5000`

### Build for Production
```bash
npm run build
npm start
```

## Environment Variables

Copy `env.example` to `.env` and fill in:
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `OPENAI_API_KEY` - OpenAI API key
- `SESSION_SECRET` - Random 32+ character string
- `FRONTEND_URL` - Frontend URL for CORS

## Database Setup

```bash
npm run db:migrate        # Run migrations
npm run create:admin      # Create admin user
npm run db:init-functions # Initialize Supabase functions
```

## Deployment

### Railway (Recommended)
1. Connect GitHub repository
2. Set root directory to `/server`
3. Add environment variables
4. Deploy automatically

See `../DEPLOYMENT_GUIDE.md` for detailed instructions.

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/admin/login` - Admin login
- `GET /api/chatbots` - List chatbots
- `POST /api/chatbots` - Create chatbot
- And more...

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - Type check
- `npm run db:migrate` - Run database migrations
