# Vercel Deployment Guide

## Prerequisites
- Vercel account
- GitHub repository connected to Vercel
- Supabase project (for database)

## Step-by-Step Deployment

### 1. **Vercel Dashboard Configuration**

#### Import Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your Git repository
4. Select the **main** branch

#### Build & Development Settings
- **Framework Preset**: Other
- **Root Directory**: `./` (leave as root)
- **Build Command**: `npm run build`
- **Output Directory**: `dist/public`
- **Install Command**: `npm install`

### 2. **Environment Variables**

Add these in Vercel Dashboard → Settings → Environment Variables:

#### Required Variables
```
NODE_ENV=production

# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# OpenAI
OPENAI_API_KEY=sk-...

# Session
SESSION_SECRET=your-random-secret-key-min-32-chars

# Email (Optional - for SendGrid)
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Your App Name

# Email (Optional - for SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure-password
```

### 3. **Database Setup**

Before deploying, ensure your Supabase database has:

1. **Run migrations** (locally first):
   ```bash
   npm run db:migrate
   ```

2. **Create admin user**:
   ```bash
   npm run create:admin
   ```

3. **Initialize Supabase functions**:
   ```bash
   npm run db:init-functions
   ```

### 4. **Deploy**

1. Click **"Deploy"** in Vercel
2. Wait for build to complete
3. Visit your deployment URL

### 5. **Post-Deployment**

#### Domain Setup
1. Go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

#### Check Deployment
- Visit: `https://your-app.vercel.app`
- Test API: `https://your-app.vercel.app/api/health`
- Login to admin: `https://your-app.vercel.app/admin`

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node version compatibility

### API Routes Not Working
- Check that `/api/*` routes are properly configured
- Verify environment variables are set
- Check function logs in Vercel dashboard

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check Supabase connection pooler settings
- Ensure IP allowlist includes Vercel IPs (or use connection pooler)

### Session Issues
- Ensure `SESSION_SECRET` is set and at least 32 characters
- For production, consider using Redis or database session store

## Important Notes

### Serverless Limitations
- **Cold starts**: First request may be slow
- **Execution time**: 10s limit on Hobby plan, 60s on Pro
- **Memory**: 1GB limit on Hobby plan

### Recommendations
1. **Use Supabase Connection Pooler** for database connections
2. **Enable caching** for static assets
3. **Monitor function logs** for errors
4. **Set up alerts** for downtime

### Alternative: Traditional Hosting
If serverless limitations are an issue, consider:
- Railway
- Render
- DigitalOcean App Platform
- AWS EC2/ECS
- Google Cloud Run

## Files Created for Deployment
- `vercel.json` - Vercel configuration
- `api/index.ts` - Serverless function entry point
- Updated `package.json` with build scripts

## Support
For issues, check:
- Vercel documentation: https://vercel.com/docs
- Vercel community: https://github.com/vercel/vercel/discussions
