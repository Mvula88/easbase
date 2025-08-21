# Stripe Webhook Setup Guide

## 1. Create Webhook Endpoint in Stripe Dashboard

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Configure as follows:

### For Production:
- **Endpoint URL**: `https://your-domain.com/api/billing/webhook`
- **Description**: "Easbase billing webhook"

### For Local Testing:
Use Stripe CLI instead (see step 3)

## 2. Select Events to Listen To

Select these events:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

## 3. Get Your Webhook Secret

After creating the endpoint:
1. Click on the webhook endpoint you just created
2. Click "Reveal" under "Signing secret"
3. Copy the secret (starts with `whsec_`)
4. Add it to your `.env.local` file:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

## 4. Local Testing with Stripe CLI

```bash
# Install Stripe CLI
# Windows (with Scoop):
scoop install stripe

# macOS:
brew install stripe/stripe-cli/stripe

# Or download from: https://stripe.com/docs/stripe-cli

# Login to your Stripe account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/billing/webhook

# The CLI will show your webhook signing secret for local testing
# Use this secret in your .env.local for development
```

## 5. Create Stripe Products and Prices

In the Stripe Dashboard:

1. Go to [Products](https://dashboard.stripe.com/products)
2. Create three products:

### Starter Plan
- Name: "Easbase Starter"
- Price: $29/month
- Recurring billing
- Copy the price ID (starts with `price_`)

### Pro Plan
- Name: "Easbase Pro"
- Price: $99/month
- Recurring billing
- Copy the price ID

### Enterprise Plan
- Name: "Easbase Enterprise"
- Price: $299/month
- Recurring billing
- Copy the price ID

3. Update your `.env.local`:
```env
STRIPE_STARTER_PRICE_ID=price_xxxxx
STRIPE_PRO_PRICE_ID=price_xxxxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx
```

## 6. Test the Integration

```bash
# Start your development server
npm run dev

# In another terminal, forward webhooks
stripe listen --forward-to localhost:3000/api/billing/webhook

# Trigger a test event
stripe trigger checkout.session.completed
```

## 7. Verify Webhook Endpoint

The webhook endpoint at `/api/billing/webhook` handles:
- User subscription creation/updates
- Payment processing
- Usage limit updates based on plan
- Automatic downgrade to free tier on cancellation

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit real API keys to version control
- Use different keys for development and production
- Always verify webhook signatures
- The webhook endpoint validates the signature to ensure requests come from Stripe

## Troubleshooting

If webhooks aren't working:
1. Check that `STRIPE_WEBHOOK_SECRET` is set correctly
2. Ensure the endpoint URL is accessible (no auth required)
3. Check Stripe Dashboard > Webhooks > Event logs for errors
4. Verify your server logs for any 400/500 errors

## Production Deployment

Before going live:
1. Switch to live API keys (not test keys)
2. Update webhook endpoint URL to your production domain
3. Test with small real transactions first
4. Monitor webhook delivery in Stripe Dashboard