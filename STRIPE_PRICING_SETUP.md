# Stripe Pricing Configuration

## Products to Create in Stripe Dashboard

### 1. Easbase Starter
- **Monthly Price:** $49.00/month
- **Annual Price:** $468.00/year (displays as $39/month, saves $120)
- **Description:** Perfect for side projects and MVPs

### 2. Easbase Growth (Most Popular)
- **Monthly Price:** $149.00/month  
- **Annual Price:** $1,548.00/year (displays as $129/month, saves $360)
- **Description:** For growing startups ready to scale

### 3. Easbase Scale
- **Monthly Price:** $399.00/month
- **Annual Price:** $4,188.00/year (displays as $349/month, saves $600)
- **Description:** For established businesses with advanced needs

## Environment Variables to Add

After creating the products in Stripe, add these to your `.env.local`:

```bash
# Stripe Price IDs - Monthly
STRIPE_STARTER_MONTHLY_PRICE_ID=price_xxx  # Get from Stripe after creating
STRIPE_GROWTH_MONTHLY_PRICE_ID=price_xxx   # Get from Stripe after creating
STRIPE_SCALE_MONTHLY_PRICE_ID=price_xxx    # Get from Stripe after creating

# Stripe Price IDs - Annual  
STRIPE_STARTER_ANNUAL_PRICE_ID=price_xxx   # Get from Stripe after creating
STRIPE_GROWTH_ANNUAL_PRICE_ID=price_xxx    # Get from Stripe after creating
STRIPE_SCALE_ANNUAL_PRICE_ID=price_xxx     # Get from Stripe after creating

# Legacy support
STRIPE_STARTER_PRICE_ID=${STRIPE_STARTER_MONTHLY_PRICE_ID}
STRIPE_GROWTH_PRICE_ID=${STRIPE_GROWTH_MONTHLY_PRICE_ID}
STRIPE_SCALE_PRICE_ID=${STRIPE_SCALE_MONTHLY_PRICE_ID}
```

## Quick Setup Script for Stripe CLI

If you have Stripe CLI installed, you can create products programmatically:

```bash
# Create Starter Product
stripe products create \
  --name="Easbase Starter" \
  --description="AI-powered backend for side projects"

# Create Growth Product  
stripe products create \
  --name="Easbase Growth" \
  --description="Everything you need to scale"

# Create Scale Product
stripe products create \
  --name="Easbase Scale" \
  --description="Advanced features for established businesses"
```

Then create prices for each product:

```bash
# Starter Prices
stripe prices create \
  --product="prod_xxx" \
  --unit-amount=4900 \
  --currency=usd \
  --recurring[interval]=month

stripe prices create \
  --product="prod_xxx" \
  --unit-amount=46800 \
  --currency=usd \
  --recurring[interval]=year

# Growth Prices
stripe prices create \
  --product="prod_xxx" \
  --unit-amount=14900 \
  --currency=usd \
  --recurring[interval]=month

stripe prices create \
  --product="prod_xxx" \
  --unit-amount=154800 \
  --currency=usd \
  --recurring[interval]=year

# Scale Prices  
stripe prices create \
  --product="prod_xxx" \
  --unit-amount=39900 \
  --currency=usd \
  --recurring[interval]=month

stripe prices create \
  --product="prod_xxx" \
  --unit-amount=418800 \
  --currency=usd \
  --recurring[interval]=year
```

## Testing Your Pricing

Use these test card numbers in Stripe test mode:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

## Webhook Events to Handle

Make sure your webhook endpoint handles these events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Revenue Calculation

### Monthly Billing
- **10 customers:** 5 Starter ($245) + 4 Growth ($596) + 1 Scale ($399) = **$1,240/month**
- **50 customers:** 20 Starter ($980) + 25 Growth ($3,725) + 5 Scale ($1,995) = **$6,700/month**
- **100 customers:** 40 Starter ($1,960) + 50 Growth ($7,450) + 10 Scale ($3,990) = **$13,400/month**

### Annual Billing (with 20% discount)
- **10 customers:** 5 Starter ($195) + 4 Growth ($516) + 1 Scale ($349) = **$1,060/month**
- **50 customers:** 20 Starter ($780) + 25 Growth ($3,225) + 5 Scale ($1,745) = **$5,750/month**
- **100 customers:** 40 Starter ($1,560) + 50 Growth ($6,450) + 10 Scale ($3,490) = **$11,500/month**

## Notes
- Annual pricing shows monthly equivalent but bills yearly upfront
- This gives you immediate cash flow (full year payment)
- Reduces churn (customers committed for a year)
- Industry standard 20% discount for annual commitment