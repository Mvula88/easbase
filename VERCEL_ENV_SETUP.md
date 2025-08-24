# Vercel Environment Variables Setup

## Steps to Add Environment Variables to Vercel:

1. **Go to your Vercel Dashboard**
2. **Select your `easbase` project**
3. **Navigate to: Settings → Environment Variables**
4. **Add each variable below:**

## Required Environment Variables for Production:

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=(get from your .env.local file)
NEXT_PUBLIC_SUPABASE_ANON_KEY=(get from your .env.local file)
SUPABASE_SERVICE_ROLE_KEY=(get from your .env.local file)
SUPABASE_SERVICE_KEY=(get from your .env.local file)
```

### Anthropic Claude API
```
ANTHROPIC_API_KEY=(get from your .env.local file)
```

### OpenAI API (for embeddings)
```
OPENAI_API_KEY=(get from your .env.local file)
```

### Stripe Configuration
```
STRIPE_SECRET_KEY=(get from your .env.local file)
STRIPE_WEBHOOK_SECRET=(get from Stripe Dashboard after creating webhook)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=(get from your .env.local file)
```

### Stripe Price IDs - Monthly
```
STRIPE_STARTER_MONTHLY_PRICE_ID=(get from your .env.local file)
STRIPE_GROWTH_MONTHLY_PRICE_ID=(get from your .env.local file)
STRIPE_SCALE_MONTHLY_PRICE_ID=(get from your .env.local file)
```

### Stripe Price IDs - Annual
```
STRIPE_STARTER_ANNUAL_PRICE_ID=(get from your .env.local file)
STRIPE_GROWTH_ANNUAL_PRICE_ID=(get from your .env.local file)
STRIPE_SCALE_ANNUAL_PRICE_ID=(get from your .env.local file)
```

### Email Service
```
EMAIL_API_KEY=(get from your .env.local file)
EMAIL_FROM_ADDRESS=(get from your .env.local file)
```

### Security & App Configuration
```
ENCRYPTION_KEY=(get from your .env.local file)
NEXT_PUBLIC_APP_URL=https://easbase.vercel.app
NODE_ENV=production
```

### Rate Limiting
```
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

### Sentry (Optional but recommended)
```
NEXT_PUBLIC_SENTRY_DSN=(optional - get from your .env.local file)
SENTRY_ORG=(optional - get from your .env.local file)
SENTRY_PROJECT=(optional - get from your .env.local file)
```

### Supabase Management API
```
SUPABASE_ACCESS_TOKEN=(get from your .env.local file)
SUPABASE_ORGANIZATION_ID=(get from your .env.local file)
SUPABASE_MANAGEMENT_API_URL=https://api.supabase.com
```

## Important Notes:

1. **NEXT_PUBLIC_APP_URL**: Change from `http://localhost:3000` to `https://easbase.vercel.app` for production
2. **NODE_ENV**: Change from `development` to `production`
3. **Test Mode**: You're using Stripe test keys (sk_test_, pk_test_). Switch to live keys when ready for production
4. **Webhook Secret**: Make sure this matches the one from Stripe dashboard after creating the webhook

## After Adding Variables:

1. **Redeploy your application** - Vercel will automatically redeploy when you add environment variables
2. **Test the webhook** - Use Stripe's test webhook feature
3. **Verify billing works** - Try creating a test subscription

## Security Note:
⚠️ Never commit these keys to GitHub. Keep them only in:
- `.env.local` (local development) 
- Vercel Environment Variables (production)