# Deployment Guide - Separate Frontend & Backend

This guide covers deploying the frontend and backend as separate projects.

## Architecture

- **Frontend**: React + Vite → Deploy to **Vercel**
- **Backend**: Express.js → Deploy to **Railway** (or Render/DigitalOcean)

## Quick Start

### 1. Backend Deployment (Railway)

#### A. Prepare Backend
```bash
cd server
npm install
```

#### B. Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Set **Root Directory**: `/server`
5. Railway will auto-detect `package.json`

#### C. Environment Variables
Add these in Railway dashboard:

```bash
NODE_ENV=production
PORT=${{PORT}}

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# OpenAI
OPENAI_API_KEY=sk-your-key

# Session
SESSION_SECRET=your-random-32-char-secret

# Email (Optional)
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@domain.com
SENDGRID_FROM_NAME=Your App

# Admin
ADMIN_EMAIL=admin@domain.com
ADMIN_PASSWORD=secure-password

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend.vercel.app
```

#### D. Get Backend URL
After deployment, Railway provides a URL like:
`https://your-app.up.railway.app`

**Save this URL** - you'll need it for frontend deployment.

---

### 2. Frontend Deployment (Vercel)

#### A. Prepare Frontend
```bash
cd client
npm install
```

#### B. Create Environment File
Create `client/.env.production`:
```bash
VITE_API_URL=https://your-backend.up.railway.app
```

#### C. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

#### D. Environment Variables
Add in Vercel dashboard:
```bash
VITE_API_URL=https://your-backend.up.railway.app
```

#### E. Deploy
Click **"Deploy"** and wait for build to complete.

---

### 3. Update Backend CORS

After frontend is deployed, update Railway environment variable:
```bash
FRONTEND_URL=https://your-frontend.vercel.app
```

Redeploy backend for changes to take effect.

---

## Local Development

### Backend (Terminal 1)
```bash
cd server
npm install
cp env.example .env
# Edit .env with your credentials
npm run dev
```
Backend runs on: `http://localhost:5000`

### Frontend (Terminal 2)
```bash
cd client
npm install
# Create .env.local
echo "VITE_API_URL=http://localhost:5000" > .env.local
npm run dev
```
Frontend runs on: `http://localhost:3000`

---

## Database Setup

Run migrations before first deployment:

```bash
cd server
npm run db:migrate
npm run create:admin
npm run db:init-functions
```

---

## Vercel Configuration

Create `client/vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## Railway Configuration (Optional)

Create `server/railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## Testing Deployment

### 1. Test Backend
```bash
curl https://your-backend.up.railway.app/api/health
```

### 2. Test Frontend
Visit: `https://your-frontend.vercel.app`

### 3. Test Full Flow
1. Go to frontend URL
2. Navigate to `/admin/login`
3. Login with admin credentials
4. Check if API calls work (check Network tab)

---

## Troubleshooting

### CORS Errors
**Symptom**: Frontend can't connect to backend
**Solution**: 
1. Verify `FRONTEND_URL` in Railway matches Vercel URL exactly
2. Check browser console for specific CORS error
3. Ensure backend CORS middleware is configured

### 404 on Frontend Routes
**Symptom**: Refresh on `/admin` gives 404
**Solution**: Vercel rewrites should handle this. Check `vercel.json` exists in `client/`

### Backend Not Starting
**Symptom**: Railway deployment fails
**Solution**:
1. Check Railway logs
2. Verify all environment variables are set
3. Ensure `PORT` is set to `${{PORT}}`

### Session Issues
**Symptom**: Can't stay logged in
**Solution**:
1. Ensure `SESSION_SECRET` is set
2. Check `Access-Control-Allow-Credentials` is `true`
3. Verify cookies are being sent (check Network tab)

---

## Custom Domains

### Frontend (Vercel)
1. Go to Vercel project → **Settings** → **Domains**
2. Add your domain (e.g., `app.yourdomain.com`)
3. Add DNS records as instructed

### Backend (Railway)
1. Go to Railway service → **Settings** → **Domains**
2. Add custom domain (e.g., `api.yourdomain.com`)
3. Add CNAME record to your DNS

---

## Monitoring

### Railway (Backend)
- **Logs**: Railway dashboard → Deployments → View Logs
- **Metrics**: CPU, Memory, Network usage graphs
- **Alerts**: Set up in Railway dashboard

### Vercel (Frontend)
- **Analytics**: Vercel dashboard → Analytics
- **Logs**: Vercel dashboard → Deployments → Function Logs
- **Performance**: Web Vitals tracking

---

## Cost Estimation

### Railway (Backend)
- Free tier: $5 credit/month
- Typical cost: $5-20/month
- Scales with usage

### Vercel (Frontend)
- Hobby plan: Free
- Pro plan: $20/month (if needed)
- Bandwidth: 100GB free, then $40/TB

**Total estimated cost**: $5-40/month depending on traffic

---

## Scaling

### Backend (Railway)
- Vertical: Increase CPU/Memory in settings
- Horizontal: Add replicas (requires stateless sessions)

### Frontend (Vercel)
- Automatic edge caching
- Global CDN distribution
- Scales automatically

---

## Backup Strategy

### Database (Supabase)
- Automatic daily backups
- Point-in-time recovery
- Manual backups via dashboard

### Code
- Git repository (GitHub)
- Tagged releases for versions

---

## Security Checklist

- [ ] Environment variables set correctly
- [ ] CORS configured properly
- [ ] SESSION_SECRET is strong (32+ chars)
- [ ] HTTPS enabled (automatic on Railway/Vercel)
- [ ] Admin password is secure
- [ ] API keys are not exposed in frontend
- [ ] Database connection uses SSL
- [ ] Rate limiting configured (if needed)

---

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Deploy frontend to Vercel
3. ✅ Update CORS settings
4. ✅ Test full application
5. ✅ Set up custom domains
6. ✅ Configure monitoring
7. ✅ Set up automated backups

---

**Your application is now deployed separately! 🚀**

- Frontend: `https://your-frontend.vercel.app`
- Backend: `https://your-backend.up.railway.app`
