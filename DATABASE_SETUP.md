# Database Setup Guide

## Prerequisites
- Supabase project created
- Database password (get from Supabase Dashboard)

## Step 1: Get Your Database Password

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/YOUR_PROJECT_REF/settings/database)
2. Navigate to Settings > Database
3. Find your database password or reset it if needed

## Step 2: Link Supabase Project

```bash
cd apps/web
npx supabase link --project-ref YOUR_PROJECT_REF
# Enter your database password when prompted
```

## Step 3: Deploy the Schema

```bash
# Push the database migrations
npx supabase db push

# Or if you want to see what will be applied first:
npx supabase db diff
```

## Step 4: Verify Deployment

1. Go to [Table Editor](https://supabase.com/dashboard/project/YOUR_PROJECT_REF/editor)
2. You should see these tables:
   - `profiles` - User profiles
   - `subscriptions` - Stripe subscriptions
   - `user_usage` - Usage tracking
   - `projects` - User projects
   - `schemas` - Generated schemas
   - `deployments` - Deployment history
   - And more...

## Alternative: Manual SQL Execution

If the CLI doesn't work, you can manually run the SQL:

1. Go to [SQL Editor](https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new)
2. Copy the contents of `supabase/migrations/001_production_schema.sql`
3. Paste and run in the SQL editor

## Troubleshooting

### If you get permission errors:
- Make sure you're using the correct database password
- Try resetting your database password in the Dashboard

### If tables already exist:
- The migration uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times
- You can drop and recreate tables if needed (be careful with data!)

### Connection issues:
```bash
# Test your connection
npx supabase db remote list

# Check your project status
npx supabase projects list
```

## Next Steps After Schema Deployment

1. **Test Authentication:**
   - Sign up a test user
   - Check that profiles, usage, and subscriptions are created automatically

2. **Configure Stripe Products:**
   - Create your subscription products in Stripe
   - Update the price IDs in your `.env.local`

3. **Test the Application:**
   ```bash
   npm run dev
   ```
   - Visit http://localhost:3000
   - Test schema generation
   - Test authentication flow

## Security Notes

⚠️ **Important:**
- The migration includes Row Level Security (RLS) policies
- Users can only access their own data
- Service role key bypasses RLS (use carefully)
- Always test RLS policies after deployment

## Useful Supabase CLI Commands

```bash
# Check migration status
npx supabase migration list

# Create a new migration
npx supabase migration new migration_name

# Reset database (WARNING: deletes all data)
npx supabase db reset

# Pull remote schema changes
npx supabase db pull

# Generate TypeScript types
npx supabase gen types typescript --local > types/supabase.ts
```