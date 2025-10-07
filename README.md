# SaaSOps - Chatbot SaaS Platform

A modern SaaS platform for creating and managing AI-powered chatbots with Supabase integration.

## Features

- **Admin Dashboard**: Manage clients, subscriptions, and chatbots
- **Client Portal**: Allow clients to manage their chatbots and view analytics
- **Chatbot Widget**: Embeddable widget for client websites
- **Knowledge Base**: Upload documents to train chatbots
- **Lead Capture**: Collect visitor information through chatbot conversations
- **Analytics**: Track chatbot performance and engagement

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Shadcn/ui
- **Backend**: Node.js, Express
- **Database**: PostgreSQL via Supabase
- **Authentication**: Express session with Passport.js
- **AI**: OpenAI API for chatbot responses
- **Vector Database**: pgvector extension in Supabase for similarity search

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works for development)
- OpenAI API key (optional, but required for chatbot functionality)

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/saasops.git
cd saasops
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Get your Supabase URL, anon key, and service key from the project settings

3. Enable the pgvector extension in the SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

4. Create storage buckets for the application:
   ```sql
   -- Create bucket for chatbot logos
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES (
       'chatbot-logos', 
       'chatbot-logos', 
       true, 
       5242880, -- 5MB limit
       ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp']
   );
   
   -- Create bucket for knowledge base documents
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES (
       'knowledge-base-docs', 
       'knowledge-base-docs', 
       false, 
       50000000, -- 50MB limit
       ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/json', 'text/plain']
   );
   ```

5. Create the vector similarity search function:
   ```sql
   CREATE OR REPLACE FUNCTION match_documents(
     query_embedding vector(1536),
     match_threshold float,
     match_count int,
     p_chatbot_id text
   )
   RETURNS TABLE (
     id uuid,
     text text,
     similarity float,
     filename text,
     metadata jsonb
   )
   LANGUAGE plpgsql
   AS $$
   BEGIN
     RETURN QUERY
     SELECT
       c.id::uuid,
       c.text,
       1 - (c.embedding <=> query_embedding) as similarity,
       d.filename,
       c.metadata
     FROM
       kb_chunks c
     JOIN
       kb_documents d ON c.document_id = d.id
     WHERE
       c.chatbot_id = p_chatbot_id
       AND 1 - (c.embedding <=> query_embedding) > match_threshold
     ORDER BY
       c.embedding <=> query_embedding
     LIMIT match_count;
   END;
   $$;
   ```

6. Create the SQL execution helper function (requires superuser privileges):
   ```sql
   CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
   RETURNS void
   LANGUAGE plpgsql
   AS $$
   BEGIN
     EXECUTE sql_query;
   END;
   $$;
   ```

### 4. Set up environment variables

Create a `.env` file in the root directory with the following variables:

```
# Required for authentication
SESSION_SECRET=your_session_secret_here

# Database connection (Postgres connection string from Supabase)
DATABASE_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres

# OpenAI API (required for chatbot functionality and embeddings)
OPENAI_API_KEY=your_openai_api_key

# Email configuration (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=your-smtp-password
DEFAULT_FROM_EMAIL=noreply@chatbotsaas.com

# Base URL for links in emails
BASE_URL=http://localhost:5000

# Port for the server (default is 5000)
PORT=5000

# Supabase configuration (all required)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

### 5. Initialize the database

1. Run the migration script to create all necessary tables:

```bash
npm run db:migrate
```

2. Initialize the Supabase functions (if you didn't create them manually in step 3):

```bash
npm run db:init-functions
```

3. Seed the database with initial data:

```bash
npm run db:seed
```

4. Create an admin user:

```bash
npm run create:admin
```

This will create an admin user with the following credentials:
- Username: admin
- Email: admin@example.com
- Password: admin123

**Important:** Change this password after your first login!

### 6. Start the development server

```bash
npm run dev
```

The application will be available at http://localhost:5000

## Development

- **Frontend**: Located in the `client/src` directory
- **Backend**: Located in the `server` directory
- **Shared Types**: Located in the `shared` directory

### Storage

The application uses Supabase for persistent storage. Make sure to set up your Supabase environment variables in the `.env` file:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

## Scripts

- `npm run dev`: Start the development server
- `npm run build`: Build the application for production
- `npm run start`: Start the production server
- `npm run db:migrate`: Run database migrations
- `npm run db:seed`: Seed the database with initial data
- `npm run db:init-functions`: Initialize Supabase database functions
- `npm run create:admin`: Create an admin user

## License

MIT
