# ✅ Database Setup Instructions for Easbase

## Current Status
✅ **Database Connection**: Working  
✅ **Health Check Table**: Created  
⚠️ **Full Schema**: Needs to be created  

## Required Steps to Complete Setup

### Step 1: Enable Vector Extension (CRITICAL)
Go to your Supabase Dashboard:
1. Navigate to **Database → Extensions**
2. Search for "**vector**"
3. Click **Enable** on the pgvector extension
4. Wait for it to activate (takes ~30 seconds)

### Step 2: Run the Full Migration
1. Go to **SQL Editor** in your Supabase Dashboard
2. Copy the ENTIRE contents of: `supabase/migrations/001_initial_schema.sql`
3. Paste it into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)

The migration will create:
- ✅ User profiles table
- ✅ Organizations table
- ✅ Team members table  
- ✅ Projects table
- ✅ Schema generations history
- ✅ Cache with vector embeddings
- ✅ Webhooks configuration
- ✅ API activity logs
- ✅ Schema versions tracking
- ✅ All necessary indexes and RLS policies

### Step 3: Verify Everything Works
After running the migration, test:

```bash
# Test health endpoint
curl http://localhost:3002/api/health

# All services should show "up" or "degraded" (not "down")
```

### Step 4: Add OpenAI API Key (Optional but Recommended)
For real semantic caching with 95% cost reduction, add to `.env.local`:
```
OPENAI_API_KEY=sk-...your-openai-api-key...
```

Without this, the system uses hash-based caching (less accurate).

## What's Working Now

### ✅ Already Functional
- Health monitoring endpoint
- Basic database connectivity
- Supabase authentication
- Service role key configuration
- Development server on port 3002

### 🚀 After Full Migration
- AI-powered schema generation
- Semantic similarity caching
- Multi-language code generation (9 languages)
- Auth template deployment
- Webhook system for AI builders
- Schema versioning & migrations
- Cross-customer intelligence sharing

## Quick Test After Setup

1. **Generate a Schema**:
   ```bash
   curl -X POST http://localhost:3002/api/generate \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Create a blog with posts, authors, and comments"}'
   ```

2. **Deploy Auth Template**:
   ```bash
   curl -X POST http://localhost:3002/api/auth/deploy \
     -H "Content-Type: application/json" \
     -d '{"template": "saas", "projectId": "test-project"}'
   ```

## Troubleshooting

### Error: "relation does not exist"
- The full migration hasn't been run yet
- Go back to Step 2

### Error: "vector extension not found"  
- pgvector isn't enabled
- Go back to Step 1

### Error: "column 'user_id' does not exist"
- Using old migration
- Use the updated `001_initial_schema.sql`

### Health check shows services as "down"
- Check `.env.local` has all required keys
- Verify Supabase project is active
- Ensure migrations have been run

## Environment Variables Checklist

Verify these are in `.env.local`:
```env
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY  
✅ SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)
✅ ANTHROPIC_API_KEY
✅ STRIPE_SECRET_KEY
✅ STRIPE_WEBHOOK_SECRET
✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
⚠️ OPENAI_API_KEY (optional but recommended)
```

## Success Indicators

When everything is set up correctly:
1. Health endpoint shows all services "up"
2. No console errors about missing tables
3. Schema generation returns AI-powered results
4. Cache hit rate increases with similar prompts
5. Webhooks trigger on schema generation

## Next Steps After Setup

1. **Test the Platform**: 
   - Generate schemas with natural language
   - Check cache efficiency
   - Deploy to test Supabase projects

2. **Integrate with AI Builders**:
   - Set up webhooks for Lovable.dev
   - Configure Bolt.new integration
   - Test with Cursor

3. **Monitor Performance**:
   - Check `/api/health` regularly
   - Monitor cache hit rates
   - Track API response times

---

**Need Help?**
- Check server logs: The dev server shows detailed errors
- Database logs: Supabase Dashboard → Logs → Database
- API testing: Use the health endpoint first

**Current Server**: http://localhost:3002