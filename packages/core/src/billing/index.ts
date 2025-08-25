import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface BillingConfig {
  projectId: string;
  stripeSecretKey?: string;
  webhookSecret?: string;
}

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    users?: number;
    storage?: number;
    api_calls?: number;
    [key: string]: any;
  };
}

interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
}

export class BillingService {
  private stripe: Stripe;
  private supabase: SupabaseClient;
  private projectId: string;
  private webhookSecret: string;

  constructor(config: BillingConfig) {
    this.projectId = config.projectId;
    this.stripe = new Stripe(
      config.stripeSecretKey || process.env.STRIPE_SECRET_KEY!,
      { apiVersion: '2023-10-16' }
    );
    this.webhookSecret = config.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET!;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  // Customer Management
  async createCustomer(userId: string, email: string, metadata?: Record<string, any>) {
    // Create Stripe customer
    const customer = await this.stripe.customers.create({
      email,
      metadata: {
        user_id: userId,
        project_id: this.projectId,
        ...metadata
      }
    });

    // Store in database
    const { error } = await this.supabase
      .from('billing_customers')
      .insert({
        user_id: userId,
        project_id: this.projectId,
        stripe_customer_id: customer.id,
        email,
        metadata
      });

    if (error) throw error;

    return customer;
  }

  async getCustomer(userId: string) {
    const { data, error } = await this.supabase
      .from('billing_customers')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', this.projectId)
      .single();

    if (error) return null;
    return data;
  }

  async updateCustomer(userId: string, updates: Stripe.CustomerUpdateParams) {
    const customer = await this.getCustomer(userId);
    if (!customer) throw new Error('Customer not found');

    const updatedCustomer = await this.stripe.customers.update(
      customer.stripe_customer_id,
      updates
    );

    return updatedCustomer;
  }

  // Subscription Management
  async createSubscription(userId: string, priceId: string, trial_days?: number) {
    const customer = await this.getCustomer(userId);
    if (!customer) {
      throw new Error('Customer not found. Please create customer first.');
    }

    const subscription = await this.stripe.subscriptions.create({
      customer: customer.stripe_customer_id,
      items: [{ price: priceId }],
      trial_period_days: trial_days,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent']
    });

    // Store subscription in database
    const { error } = await this.supabase
      .from('billing_subscriptions')
      .insert({
        user_id: userId,
        project_id: this.projectId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end
      });

    if (error) throw error;

    return {
      subscription,
      clientSecret: (subscription.latest_invoice as Stripe.Invoice)?.payment_intent && 
                   typeof (subscription.latest_invoice as Stripe.Invoice).payment_intent !== 'string' ?
                   ((subscription.latest_invoice as Stripe.Invoice).payment_intent as Stripe.PaymentIntent).client_secret :
                   undefined
    };
  }

  async getSubscription(userId: string) {
    const { data, error } = await this.supabase
      .from('billing_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', this.projectId)
      .eq('status', 'active')
      .single();

    if (error) return null;

    // Get full details from Stripe
    const subscription = await this.stripe.subscriptions.retrieve(
      data.stripe_subscription_id
    );

    return subscription;
  }

  async updateSubscription(userId: string, priceId: string) {
    const { data } = await this.supabase
      .from('billing_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .eq('project_id', this.projectId)
      .eq('status', 'active')
      .single();

    if (!data) throw new Error('No active subscription found');

    const subscription = await this.stripe.subscriptions.retrieve(data.stripe_subscription_id);
    
    const updatedSubscription = await this.stripe.subscriptions.update(
      data.stripe_subscription_id,
      {
        items: [{
          id: subscription.items.data[0].id,
          price: priceId
        }],
        proration_behavior: 'always_invoice'
      }
    );

    // Update database
    await this.supabase
      .from('billing_subscriptions')
      .update({ stripe_price_id: priceId })
      .eq('stripe_subscription_id', data.stripe_subscription_id);

    return updatedSubscription;
  }

  async cancelSubscription(userId: string, immediately = false) {
    const { data } = await this.supabase
      .from('billing_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .eq('project_id', this.projectId)
      .eq('status', 'active')
      .single();

    if (!data) throw new Error('No active subscription found');

    const canceledSubscription = immediately ?
      await this.stripe.subscriptions.cancel(data.stripe_subscription_id) :
      await this.stripe.subscriptions.update(
        data.stripe_subscription_id,
        { cancel_at_period_end: true }
      );

    // Update database
    await this.supabase
      .from('billing_subscriptions')
      .update({
        status: immediately ? 'canceled' : 'active',
        cancel_at_period_end: !immediately
      })
      .eq('stripe_subscription_id', data.stripe_subscription_id);

    return canceledSubscription;
  }

  async resumeSubscription(userId: string) {
    const { data } = await this.supabase
      .from('billing_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .eq('project_id', this.projectId)
      .eq('cancel_at_period_end', true)
      .single();

    if (!data) throw new Error('No subscription scheduled for cancellation');

    const resumedSubscription = await this.stripe.subscriptions.update(
      data.stripe_subscription_id,
      { cancel_at_period_end: false }
    );

    // Update database
    await this.supabase
      .from('billing_subscriptions')
      .update({ cancel_at_period_end: false })
      .eq('stripe_subscription_id', data.stripe_subscription_id);

    return resumedSubscription;
  }

  // Checkout & Payment
  async createCheckoutSession(userId: string, priceId: string, successUrl: string, cancelUrl: string) {
    const customer = await this.getCustomer(userId);
    
    const session = await this.stripe.checkout.sessions.create({
      customer: customer?.stripe_customer_id,
      customer_email: customer ? undefined : (await this.getUserEmail(userId)),
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_update: customer ? {
        address: 'auto'
      } : undefined,
      metadata: {
        user_id: userId,
        project_id: this.projectId
      }
    });

    return session;
  }

  async createPaymentIntent(userId: string, amount: number, currency = 'usd') {
    const customer = await this.getCustomer(userId);
    if (!customer) throw new Error('Customer not found');

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency,
      customer: customer.stripe_customer_id,
      metadata: {
        user_id: userId,
        project_id: this.projectId
      }
    });

    return paymentIntent;
  }

  // Customer Portal
  async createPortalSession(userId: string, returnUrl: string) {
    const customer = await this.getCustomer(userId);
    if (!customer) throw new Error('Customer not found');

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: returnUrl
    });

    return session;
  }

  // Usage-Based Billing
  async recordUsage(userId: string, quantity: number, timestamp?: number) {
    const subscription = await this.getSubscription(userId);
    if (!subscription) throw new Error('No active subscription');

    // Find the metered price item
    const meteredItem = subscription.items.data.find(
      item => item.price.recurring?.usage_type === 'metered'
    );

    if (!meteredItem) throw new Error('No metered pricing found');

    const usageRecord = await this.stripe.subscriptionItems.createUsageRecord(
      meteredItem.id,
      {
        quantity,
        timestamp: timestamp || Math.floor(Date.now() / 1000),
        action: 'increment'
      }
    );

    // Store in database for tracking
    await this.supabase
      .from('billing_usage')
      .insert({
        user_id: userId,
        project_id: this.projectId,
        subscription_item_id: meteredItem.id,
        quantity,
        timestamp: new Date(timestamp ? timestamp * 1000 : Date.now())
      });

    return usageRecord;
  }

  async getUsage(userId: string, startDate?: Date, endDate?: Date) {
    let query = this.supabase
      .from('billing_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', this.projectId);

    if (startDate) {
      query = query.gte('timestamp', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('timestamp', endDate.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    return data;
  }

  // Invoices
  async getInvoices(userId: string, limit = 10) {
    const customer = await this.getCustomer(userId);
    if (!customer) return [];

    const invoices = await this.stripe.invoices.list({
      customer: customer.stripe_customer_id,
      limit
    });

    return invoices.data;
  }

  async downloadInvoice(invoiceId: string) {
    const invoice = await this.stripe.invoices.retrieve(invoiceId);
    return invoice.invoice_pdf;
  }

  // Webhook Handling
  async handleWebhook(signature: string, payload: string) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
    } catch (err) {
      throw new Error('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
    }

    return { received: true };
  }

  // Webhook Handlers
  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.user_id;
    if (!userId) return;

    // Create or update customer
    if (session.customer && !await this.getCustomer(userId)) {
      await this.supabase
        .from('billing_customers')
        .insert({
          user_id: userId,
          project_id: this.projectId,
          stripe_customer_id: session.customer as string,
          email: session.customer_email
        });
    }
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    await this.supabase
      .from('billing_subscriptions')
      .upsert({
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date()
      });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await this.supabase
      .from('billing_subscriptions')
      .update({ status: 'canceled' })
      .eq('stripe_subscription_id', subscription.id);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    // Send notification email
    console.log(`Payment failed for invoice ${invoice.id}`);
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    // Update payment status
    console.log(`Payment succeeded for invoice ${invoice.id}`);
  }

  // Helper Methods
  private async getUserEmail(userId: string): Promise<string> {
    const { data } = await this.supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();
    
    return data?.email || '';
  }

  // Pricing Plans
  async getPlans(): Promise<PricingPlan[]> {
    // This could be from database or hardcoded
    return [
      {
        id: 'price_starter',
        name: 'Starter',
        price: 149,
        interval: 'month',
        features: [
          'Up to 10 users',
          '10GB storage',
          '10,000 API calls/month',
          'Email support'
        ],
        limits: {
          users: 10,
          storage: 10,
          api_calls: 10000
        }
      },
      {
        id: 'price_growth',
        name: 'Growth',
        price: 499,
        interval: 'month',
        features: [
          'Up to 50 users',
          '100GB storage',
          '100,000 API calls/month',
          'Priority support',
          'Advanced analytics'
        ],
        limits: {
          users: 50,
          storage: 100,
          api_calls: 100000
        }
      },
      {
        id: 'price_enterprise',
        name: 'Enterprise',
        price: 1499,
        interval: 'month',
        features: [
          'Unlimited users',
          '1TB storage',
          'Unlimited API calls',
          '24/7 phone support',
          'Custom integrations',
          'SLA guarantee'
        ],
        limits: {
          users: -1,
          storage: 1000,
          api_calls: -1
        }
      }
    ];
  }
}