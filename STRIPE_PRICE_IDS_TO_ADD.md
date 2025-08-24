# Add These Stripe Price IDs to Your .env.local

## Create these products in your Stripe Dashboard first:

### 1. Go to https://dashboard.stripe.com/products

### 2. Create Monthly Prices:

#### Starter Plan - $149/month
```
STRIPE_STARTER_MONTHLY_PRICE_ID=price_xxx
```

#### Professional Plan - $349/month  
```
STRIPE_GROWTH_MONTHLY_PRICE_ID=price_xxx
```

#### Business Plan - $749/month
```
STRIPE_SCALE_MONTHLY_PRICE_ID=price_xxx
```

### 3. Create Annual Prices (with discount):

#### Starter Annual - $1,188/year (33% off = $99/month)
```
STRIPE_STARTER_ANNUAL_PRICE_ID=price_xxx
```

#### Professional Annual - $3,192/year (33% off = $266/month)
```
STRIPE_GROWTH_ANNUAL_PRICE_ID=price_xxx
```

#### Business Annual - $7,992/year (33% off = $666/month)
```
STRIPE_SCALE_ANNUAL_PRICE_ID=price_xxx
```

## How to Create in Stripe:

1. Go to Products → Add Product
2. Name: "Easbase Starter" (or Professional/Business)
3. Add Pricing:
   - Monthly: Set recurring price
   - Annual: Set recurring yearly price with discount

## Add to your .env.local:

```bash
# Monthly Prices
STRIPE_STARTER_MONTHLY_PRICE_ID=price_[your_actual_id]
STRIPE_GROWTH_MONTHLY_PRICE_ID=price_[your_actual_id]
STRIPE_SCALE_MONTHLY_PRICE_ID=price_[your_actual_id]

# Annual Prices (33% discount for early adopters)
STRIPE_STARTER_ANNUAL_PRICE_ID=price_[your_actual_id]
STRIPE_GROWTH_ANNUAL_PRICE_ID=price_[your_actual_id]
STRIPE_SCALE_ANNUAL_PRICE_ID=price_[your_actual_id]
```

## Test Mode IDs (for development):
If you want to test first, create these in Test Mode:
- Use `price_` IDs from test mode
- Switch to live mode when ready