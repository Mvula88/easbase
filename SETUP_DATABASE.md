# Database Setup Guide for Easbase

## Quick Setup

To set up your Supabase database for Easbase, follow these steps:

### Step 1: Enable Required Extensions

Go to your Supabase Dashboard → SQL Editor and run:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
```

### Step 2: Run the Migration

The complete migration SQL is located in:
`supabase/migrations/001_initial_schema.sql`

Copy the entire contents of that file and paste it into your Supabase SQL Editor, then click "Run".

### Step 3: Verify Setup

After running the migration, test that everything is working:

1. Visit http://localhost:3002/api/health
2. All services should show as "up" or "degraded" (not "down")
3. The database service specifically should show as "up"

## Alternative: Use Node.js Script

If you prefer to run migrations programmatically:

```bash
# Install dependencies if not already installed
npm install @supabase/supabase-js dotenv

# Run the migration script
node scripts/run-migrations.js
```

## Troubleshooting

### "vector extension not found" Error

If you get an error about the vector extension:

1. Go to Supabase Dashboard → Database → Extensions
2. Search for "vector" 
3. Click "Enable" on the pgvector extension
4. Re-run the migration

### "column 'user_id' does not exist" Error

This means the migrations haven't been run yet. Follow Step 2 above.

### Health Check Still Shows Database as Down

1. Ensure you've run the full migration
2. Check that the `health_check` table exists:
   ```sql
   SELECT * FROM health_check LIMIT 1;
   ```
3. Verify your service role key is correct in `.env.local`

## What Gets Created

The migration creates the following tables:
- `profiles` - User profiles linked to auth.users
- `organizations` - Multi-tenant organizations
- `team_members` - Organization team members
- `projects` - Customer projects
- `schema_generations` - Generated schema history
- `cache` - AI response cache with vector embeddings
- `health_check` - Health monitoring
- `webhooks` - Webhook configurations
- `api_activity` - API request logs
- `schema_versions` - Schema version tracking
- `auth_templates` - Pre-built auth templates

Plus indexes, RLS policies, and helper functions.

## Next Steps

After database setup is complete:

1. Test schema generation at http://localhost:3002
2. Configure your OpenAI API key in `.env.local` for real embeddings:
   ```
   OPENAI_API_KEY=your-openai-api-key
   ```
3. Set up Stripe webhook endpoint in Stripe Dashboard
4. Configure production domain in environment variables

## Production Deployment

For production:

1. Use separate Supabase projects for staging and production
2. Enable all RLS policies
3. Set up database backups
4. Configure monitoring (Sentry, etc.)
5. Use environment-specific `.env` files