# Stripe Webhook Configuration Details

## Your Webhook Endpoint URL
```
https://easbase.vercel.app/api/billing/webhook
```

## In Stripe Dashboard:

1. **Navigate to:** Developers → Webhooks
2. **Click:** "Add endpoint"
3. **Enter Endpoint URL:** `https://easbase.vercel.app/api/billing/webhook`

## Select These Events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## After Creating:
1. Copy the "Signing secret" (starts with `whsec_`)
2. Add it to Vercel Environment Variables as `STRIPE_WEBHOOK_SECRET`

## Your Live URL:
- **Production:** https://easbase.vercel.app
- **Webhook Path:** /api/billing/webhook
- **Full Webhook URL:** https://easbase.vercel.app/api/billing/webhook