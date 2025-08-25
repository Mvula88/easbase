import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/auth/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { returnUrl, refreshUrl } = await req.json();

    // Check if user already has a Connect account
    const { data: seller } = await supabase
      .from('sellers')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .single();

    let accountId = seller?.stripe_account_id;

    // Create new Connect account if doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          user_id: user.id,
        },
      });

      accountId = account.id;

      // Save account ID to database
      await supabase
        .from('sellers')
        .upsert({
          user_id: user.id,
          stripe_account_id: accountId,
          email: user.email,
          onboarding_completed: false,
          created_at: new Date().toISOString(),
        });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/seller/onboarding`,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/seller/success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    console.error('Stripe Connect onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to create onboarding link' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get seller account status
    const { data: seller } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!seller?.stripe_account_id) {
      return NextResponse.json({ 
        status: 'not_connected',
        message: 'No Stripe account connected' 
      });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(seller.stripe_account_id);

    // Update onboarding status if changed
    if (account.details_submitted && !seller.onboarding_completed) {
      await supabase
        .from('sellers')
        .update({ 
          onboarding_completed: true,
          payouts_enabled: account.payouts_enabled,
          charges_enabled: account.charges_enabled,
        })
        .eq('user_id', user.id);
    }

    return NextResponse.json({
      status: account.details_submitted ? 'connected' : 'pending',
      payouts_enabled: account.payouts_enabled,
      charges_enabled: account.charges_enabled,
      account,
    });
  } catch (error: any) {
    console.error('Get account status error:', error);
    return NextResponse.json(
      { error: 'Failed to get account status' },
      { status: 500 }
    );
  }
}