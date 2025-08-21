# Quick Setup Commands

## 1. Link Your Supabase Project

Run this command and enter your database password when prompted:

```bash
cd apps/web
npx supabase link --project-ref rgpitrwgattviyazsahf
```

**Need your database password?**
1. Go to: https://supabase.com/dashboard/project/rgpitrwgattviyazsahf/settings/database
2. Find or reset your database password

## 2. Push the Database Schema

After linking, run:

```bash
npx supabase db push
```

## 3. Alternative: Direct SQL Method (Easier!)

If the CLI gives you trouble, just copy and paste the SQL directly:

1. **Open SQL Editor:**
   https://supabase.com/dashboard/project/rgpitrwgattviyazsahf/sql/new

2. **Copy the migration SQL:**
   - Open `supabase/migrations/001_production_schema.sql`
   - Copy ALL the content

3. **Paste and Run in Supabase:**
   - Paste the SQL in the editor
   - Click "Run" button

## 4. Start Development

```bash
cd ../..  # Go back to root
npm install
npm run dev
```

Visit: http://localhost:3000

## 5. Test Your Setup

1. **Check Tables Created:**
   https://supabase.com/dashboard/project/rgpitrwgattviyazsahf/editor

   You should see:
   - profiles
   - subscriptions
   - user_usage
   - projects
   - schemas
   - deployments
   - And more...

2. **Test Sign Up:**
   - Go to http://localhost:3000/signup
   - Create a test account
   - Check that user profile is created automatically

## Troubleshooting

### If you get "password authentication failed":
- Reset your database password in Supabase Dashboard
- Try again with the new password

### If tables already exist:
- The migration uses IF NOT EXISTS, so it's safe
- Or drop all tables and run again (careful with data!)

### Quick Reset (if needed):
```sql
-- Run this in SQL editor to drop all tables and start fresh
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Then run the migration again.