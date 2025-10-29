# Create Supabase Admin User

This script creates an admin user in Supabase Auth.

## Usage

From the `server` directory:

```bash
npm run create:admin
```

Or directly:

```bash
node ../scripts/create-supabase-admin.js
```

## What it does

1. Prompts for admin email, password, and username
2. Creates a user in Supabase Auth
3. Sets `user_metadata.role = 'admin'`
4. Confirms email automatically (no verification needed)

## Requirements

Make sure these environment variables are set in your `.env` file:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Your Supabase service role key (not anon key!)

## Example

```bash
$ npm run create:admin

🔧 Supabase Admin User Creator

Enter admin email: admin@example.com
Enter admin password: SecurePassword123!
Enter admin username (optional): admin

🔄 Creating admin user...

✅ Admin user created successfully!

User Details:
  ID: 12345678-1234-1234-1234-123456789012
  Email: admin@example.com
  Username: admin
  Role: admin

📝 You can now login with:
  Email: admin@example.com
  Password: SecurePassword123!
```

## Login

After creating an admin, you can login via:

```bash
POST /api/admin/login
{
  "email": "admin@example.com",
  "password": "SecurePassword123!"
}
```

The response will include an `access_token` that you can use for authenticated requests.

## Troubleshooting

**Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set**
- Make sure your `.env` file has these variables
- The script looks for `.env` in the project root

**Error: User already exists**
- The email is already registered in Supabase Auth
- Use a different email or delete the existing user from Supabase Dashboard

**Error: Invalid password**
- Supabase requires passwords to be at least 6 characters
- Use a stronger password
