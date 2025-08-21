import Stripe from 'stripe';
import { getEnv } from '@/lib/config/env';

let stripe: Stripe | null = null;

export function getStripeClient() {
  if (!stripe) {
    const env = getEnv();
    stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    });
  }
  return stripe;
}

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    tokens: 10000,
    deployments: 5,
    projects: 1,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 29,
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    tokens: 100000,
    deployments: 50,
    projects: 5,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 99,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    tokens: 500000,
    deployments: 200,
    projects: 20,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    tokens: 2000000,
    deployments: 1000,
    projects: 100,
  },
};

export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  planId: keyof typeof PLANS,
  successUrl: string,
  cancelUrl: string
) {
  const stripe = getStripeClient();
  const plan = PLANS[planId];

  if (!plan.priceId) {
    throw new Error('Invalid plan selected');
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: userEmail,
    line_items: [
      {
        price: plan.priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      planId,
    },
    subscription_data: {
      metadata: {
        userId,
        planId,
      },
    },
  });

  return session;
}

export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
) {
  const stripe = getStripeClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

export async function handleWebhook(
  payload: string | Buffer,
  signature: string
) {
  const stripe = getStripeClient();
  const env = getEnv();

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );

    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

export async function createUsageRecord(
  subscriptionItemId: string,
  quantity: number,
  timestamp = Math.floor(Date.now() / 1000)
) {
  const stripe = getStripeClient();

  const usageRecord = await stripe.subscriptionItems.createUsageRecord(
    subscriptionItemId,
    {
      quantity,
      timestamp,
      action: 'increment',
    }
  );

  return usageRecord;
}

export async function getSubscription(subscriptionId: string) {
  const stripe = getStripeClient();
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function cancelSubscription(subscriptionId: string) {
  const stripe = getStripeClient();
  return stripe.subscriptions.cancel(subscriptionId);
}

export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string
) {
  const stripe = getStripeClient();
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  });
}