# Supabase Auth Migration Guide

## What Changed

Your authentication system has been migrated from **Passport.js sessions** to **Supabase Auth with JWT tokens**.

### Benefits:
✅ **Works on Vercel** - No session storage needed
✅ **Stateless** - JWT tokens work across serverless instances  
✅ **Scalable** - No memory/database session storage required
✅ **Secure** - Supabase handles token generation and validation

---

## API Changes

### Authentication Endpoints

#### Admin Login
```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "admin_id",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin"
  },
  "session": { ... },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Client Login
```http
POST /api/client/login
Content-Type: application/json

{
  "email": "client@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "client_id",
    "email": "client@example.com",
    "companyName": "Company Name",
    "role": "client"
  },
  "session": { ... },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Logout
```http
POST /api/logout
Authorization: Bearer <access_token>
```

#### Get Current User
```http
GET /api/admin/me
Authorization: Bearer <access_token>
```

```http
GET /api/client/me
Authorization: Bearer <access_token>
```

---

## Frontend Integration

### 1. Login Flow

```javascript
// Admin login
const response = await fetch('http://localhost:5000/api/admin/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ username, password })
});

const { access_token, user } = await response.json();

// Store token in localStorage
localStorage.setItem('access_token', access_token);
localStorage.setItem('user', JSON.stringify(user));
```

### 2. Making Authenticated Requests

```javascript
const token = localStorage.getItem('access_token');

const response = await fetch('http://localhost:5000/api/admin/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 3. Logout

```javascript
const token = localStorage.getItem('access_token');

await fetch('http://localhost:5000/api/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Clear local storage
localStorage.removeItem('access_token');
localStorage.removeItem('user');
```

---

## Backend Middleware

### Protecting Routes

```typescript
import { requireAdminAuth, requireClientAuth } from "../middleware/auth.js";

// Admin-only route
router.get("/admin/dashboard", requireAdminAuth, async (req, res) => {
  const user = req.supabaseUser;
  // user is guaranteed to be an admin
});

// Client-only route
router.get("/client/dashboard", requireClientAuth, async (req, res) => {
  const user = req.supabaseUser;
  // user is guaranteed to be a client
});

// Any authenticated user
router.get("/profile", requireAuth, async (req, res) => {
  const user = req.supabaseUser;
  // user is authenticated
});
```

---

## Important Notes

### 1. No More Cookies
- Sessions are no longer stored in cookies
- Frontend must store and send JWT tokens manually
- Use `localStorage` or secure cookie storage

### 2. Token Expiration
- Supabase tokens expire after 1 hour by default
- Implement token refresh logic in your frontend
- Or handle 401 errors and redirect to login

### 3. CORS Configuration
- CORS is already configured for your Vercel frontend
- Tokens are sent in `Authorization` header (not cookies)
- No need for `credentials: 'include'`

### 4. User Metadata
- Admin users have `role: 'admin'` in `user_metadata`
- Client users have `role: 'client'` in `user_metadata`
- Additional data stored in `user_metadata`

---

## Testing

### Local Development
```bash
cd server
npm run dev
```

### Test Login
```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'
```

### Test Protected Route
```bash
curl http://localhost:5000/api/admin/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Deployment to Vercel

1. **No DATABASE_URL needed** - Sessions are not stored in database
2. **Ensure environment variables are set:**
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SESSION_SECRET` (still used for other purposes)

3. **Deploy:**
   ```bash
   git add .
   git commit -m "Migrate to Supabase Auth"
   git push
   ```

Vercel will automatically redeploy with the new authentication system!

---

## Rollback (if needed)

If you need to rollback to Passport sessions:

1. Restore `routes/auth.ts` from git history
2. Update `index.ts` to import and use `authRoutes` and `configureAuth`
3. Restore original `middleware/auth.ts`

But Supabase Auth is recommended for production!
