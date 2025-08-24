# 🔧 Fix Your Database Tables - Quick Guide

## Current Status
Based on your Supabase screenshot, you have some tables but are missing critical ones for full functionality.

## ✅ What You Have:
- `customers` table (empty)
- `cache` table
- `health_check` table
- `projects`, `schemas`, `deployments` tables
- Other supporting tables

## ❌ What's Missing:
- `profiles` - User profiles linked to auth
- `organizations` - Multi-tenant support
- `team_members` - Team collaboration
- `schema_generations` - Track generated schemas
- `webhooks` - AI builder integrations
- `api_activity` - API monitoring
- `schema_versions` - Version control

## 🚀 Quick Fix (2 minutes)

### Step 1: Enable Vector Extension
1. Go to your Supabase Dashboard
2. Navigate to **Database → Extensions**
3. Search for "**vector**"
4. Click **Enable** (if not already enabled)

### Step 2: Run the Migration
1. Go to **SQL Editor** in Supabase
2. Copy ALL contents from: `supabase/migrations/002_add_missing_tables.sql`
3. Paste in SQL Editor
4. Click **RUN**

### Step 3: Verify
After running, you should see:
- ✅ All new tables created
- ✅ RLS policies applied
- ✅ Indexes created
- ✅ Vector search enabled

### Step 4: Test
```bash
# Test the health endpoint
curl http://localhost:3002/api/health

# Should show all services as "up"
```

## 🎯 What This Fixes:

1. **Authentication**: Profiles table links users properly
2. **Multi-tenancy**: Organizations and teams work
3. **Schema Generation**: Can track and version schemas
4. **AI Builder Integration**: Webhooks table enables integrations
5. **Vector Search**: Real semantic caching with embeddings
6. **API Monitoring**: Track usage and performance

## 📊 After Migration:

Your Supabase should have these tables:
```
✅ profiles (NEW)
✅ organizations (NEW)
✅ team_members (NEW)
✅ projects (UPDATED)
✅ schema_generations (NEW)
✅ cache (UPDATED with vector)
✅ webhooks (NEW)
✅ api_activity (NEW)
✅ schema_versions (NEW)
✅ health_check (existing)
+ all your existing tables
```

## 🔥 Then What?

Once tables are created:

1. **Generate a schema** in dashboard
2. **Click "Send to Lovable"** or other AI builder
3. **Watch the magic happen** - Full app generated with your backend

## ⚠️ Troubleshooting:

**Error: "vector type does not exist"**
- You need to enable pgvector extension first (Step 1)

**Error: "relation already exists"**
- That's OK! The migration checks for existing tables

**Error: "permission denied"**
- Make sure you're using the service role key

## 💡 Pro Tip:

After migration, try this in your dashboard:
```
"Create a SaaS platform with teams, billing, and projects"
```

Then click "Send to Lovable" - it will generate a complete SaaS app!

---

**Need help?** The migration is safe to run multiple times - it checks for existing tables.