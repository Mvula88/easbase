import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/services/stripe';
import { createClient } from '@/lib/auth/supabase-server';
import { PRICING_PLANS } from '@/lib/config/pricing';
import { getBackendOrchestrator } from '@/lib/services/backend-orchestrator';

export async function POST(req: NextRequest) {
  try {
    const { priceId, billingPeriod, planKey } = await req.json();
    
    // Get the user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate plan
    if (!planKey || !PRICING_PLANS[planKey as keyof typeof PRICING_PLANS]) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const plan = PRICING_PLANS[planKey as keyof typeof PRICING_PLANS];
    
    // Determine the correct price ID based on billing period
    let finalPriceId = priceId;
    if (billingPeriod === 'annual') {
      finalPriceId = plan.stripePriceIdAnnual || plan.stripePriceId;
    } else {
      finalPriceId = plan.stripePriceIdMonthly || plan.stripePriceId;
    }

    // If no price ID configured, create one dynamically (for development)
    if (!finalPriceId) {
      const price = await stripe.prices.create({
        product_data: {
          name: `${plan.name} Plan`,
          metadata: { plan_key: planKey },
        },
        unit_amount: (billingPeriod === 'annual' ? plan.priceAnnual : plan.price) * 100,
        currency: 'usd',
        recurring: {
          interval: billingPeriod === 'annual' ? 'year' : 'month',
        },
      });
      finalPriceId = price.id;
    }

    // Create or retrieve customer
    let customerId: string;
    
    // Check if customer already exists in user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (profile.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
    } else {
      // Use orchestrator to create customer
      const orchestrator = await getBackendOrchestrator();
      const billingService = orchestrator.getBillingService();
      
      const customer = await billingService.createCustomer({
        userId: user.id,
        email: profile.email || user.email!,
        name: profile.full_name,
      });
      
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan_key: planKey,
        billing_period: billingPeriod,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          user_id: user.id,
          plan_key: planKey,
          billing_period: billingPeriod,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}