# Easbase - Supabase OAuth App Setup Guide

## Overview
This guide will help you set up Easbase as a middleman platform that provisions and manages Supabase backends for your customers while keeping Supabase completely hidden from them.

## Architecture
```
User → Easbase Platform → Supabase Management API → Customer's Supabase Project
         (Your Brand)        (Hidden)                    (Hidden)
```

## Step 1: Register Your OAuth Application on Supabase

1. Go to: https://supabase.com/dashboard/org/vizlxayylfgwvkyjqgmx/apps
2. Click "Add application"
3. Fill in the following details:

   **Application Details:**
   - **Application name:** Easbase
   - **Website URL:** https://easbase.io (or your domain)
   - **Logo:** Upload your Easbase logo

   **Authorization Callback URLs:**
   - For development: `http://localhost:3000/api/auth/callback/supabase`
   - For production: `https://yourdomain.com/api/auth/callback/supabase`

   **Application Permissions:**
   Select the following scopes:
   - ✅ Analytics (Read access)
   - ✅ Auth (Full access)
   - ✅ Database (Full access)
   - ✅ Database Migrations (Full access)
   - ✅ Database Pooler (Full access)
   - ✅ Database Types (Read access)
   - ✅ Edge Functions (Full access)
   - ✅ Organizations (Read access)
   - ✅ Projects (Full access)
   - ✅ Realtime (Full access)
   - ✅ Secrets (Full access)
   - ✅ Storage (Full access)
   - ✅ Storage Buckets (Full access)

4. Click "Create Application"
5. Copy the **Client ID** and **Client Secret**

## Step 2: Configure Environment Variables

Add the OAuth credentials to your `.env.local`:

```env
# OAuth App Configuration
SUPABASE_OAUTH_CLIENT_ID=your_client_id_here
SUPABASE_OAUTH_CLIENT_SECRET=your_client_secret_here
SUPABASE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/callback/supabase
```

## Step 3: Run Database Migrations

Execute the migration to create the necessary tables:

```bash
npx supabase db push
```

Or manually run the migration in your Supabase SQL editor:
- Navigate to SQL Editor in your Supabase dashboard
- Paste the contents of `supabase/migrations/003_customer_backends.sql`
- Execute the query

## Step 4: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Test provisioning:
   ```bash
   curl http://localhost:3000/api/test-provisioning
   ```

   You should see:
   ```json
   {
     "status": "ready",
     "message": "Model B provisioning is ready!",
     "configuration": {
       "organizationFound": true,
       "organizationName": "Easbase Customers",
       "organizationId": "vizlxayylfgwvkyjqgmx",
       "provisioningEnabled": true
     }
   }
   ```

## Step 5: How It Works

### Customer Journey:

1. **Customer Signs Up on Easbase**
   - They create an account on YOUR platform
   - They never see or interact with Supabase

2. **Customer Creates a Backend**
   - They click "Create Backend" on your dashboard
   - Behind the scenes, Easbase:
     - Creates a new Supabase project via API
     - Stores credentials securely
     - Generates custom endpoints (e.g., `api-abc123.backend.easbase.io`)

3. **Customer Uses Their Backend**
   - They get Easbase-branded endpoints:
     ```
     API: https://api-abc123.backend.easbase.io
     Auth: https://auth-abc123.backend.easbase.io
     Storage: https://storage-abc123.backend.easbase.io
     ```
   - All requests go through your proxy
   - Supabase is completely hidden

4. **Customer Manages Their Backend**
   - View usage statistics
   - Upgrade/downgrade plans
   - Pause/resume services
   - All through YOUR dashboard

## Step 6: API Usage

### Create a Backend (Internal API)
```javascript
POST /api/backends
{
  "name": "My SaaS Backend",
  "template": "saas",
  "plan": "pro"
}
```

### Customer API Usage (Through Proxy)
```javascript
// Customer uses Easbase endpoints, not Supabase
fetch('https://api-abc123.backend.easbase.io/users', {
  headers: {
    'X-Easbase-Key': 'their_api_key',
    'Content-Type': 'application/json'
  }
})
```

## Step 7: Custom Domain Setup (Optional)

To fully white-label the service:

1. Set up wildcard DNS for `*.backend.easbase.io`
2. Configure reverse proxy (nginx/Cloudflare Workers)
3. SSL certificates for subdomains

Example nginx configuration:
```nginx
server {
    server_name ~^(?<subdomain>.+)\.backend\.easbase\.io$;
    
    location / {
        proxy_pass http://localhost:3000/api/proxy/;
        proxy_set_header X-Subdomain $subdomain;
        proxy_set_header Host $host;
    }
}
```

## Step 8: Billing Integration

The system tracks usage per backend:
- Database storage
- File storage
- Bandwidth
- API requests

Integrate with Stripe for billing:
```javascript
// When usage exceeds limits
if (usage.requests > limits.requests) {
  // Trigger upgrade prompt or auto-charge
  await chargeOverage(customerId, usage);
}
```

## Security Considerations

1. **API Key Rotation**: Implement regular key rotation
2. **Rate Limiting**: Already configured per backend
3. **Encryption**: Store sensitive credentials encrypted
4. **Audit Logs**: Track all API usage
5. **IP Whitelisting**: Optional for enterprise customers

## Monitoring

Monitor your platform with:
```sql
-- Check active backends
SELECT 
  COUNT(*) as total_backends,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
  COUNT(CASE WHEN plan = 'pro' THEN 1 END) as pro_customers
FROM customer_backends;

-- Check API usage
SELECT 
  backend_id,
  COUNT(*) as requests_today,
  AVG(response_time_ms) as avg_response_time
FROM api_usage_logs
WHERE timestamp > NOW() - INTERVAL '1 day'
GROUP BY backend_id;
```

## Revenue Model

Your platform can charge:
- **Free Tier**: 1 backend, 50K requests/month
- **Pro**: $29/month - 5 backends, 1M requests/month
- **Enterprise**: Custom pricing - Unlimited backends

While paying Supabase:
- $0 for free tier projects
- $25/month per Pro project

## Support

For issues or questions:
- Check logs: `/api/health`
- Test provisioning: `/api/test-provisioning`
- View backends: `/api/backends`

## Next Steps

1. ✅ Complete OAuth app registration
2. ✅ Add environment variables
3. ✅ Run migrations
4. ✅ Test provisioning
5. 🔄 Set up custom domains
6. 🔄 Configure billing
7. 🔄 Launch to customers!

---

**Important:** Keep your `SUPABASE_ACCESS_TOKEN` and OAuth credentials secure. Never expose them to client-side code.