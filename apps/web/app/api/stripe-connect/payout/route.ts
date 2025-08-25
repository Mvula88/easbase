import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/auth/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Automated payout processing (called by webhook after successful purchase)
export async function POST(req: NextRequest) {
  try {
    const { 
      templateId, 
      sellerId, 
      amount, 
      purchaseId 
    } = await req.json();

    // Get seller's Stripe account
    const supabase = await createClient();
    const { data: seller } = await supabase
      .from('sellers')
      .select('stripe_account_id')
      .eq('user_id', sellerId)
      .single();

    if (!seller?.stripe_account_id) {
      console.error('Seller has no Stripe account:', sellerId);
      return NextResponse.json(
        { error: 'Seller not connected to Stripe' },
        { status: 400 }
      );
    }

    // Calculate platform fee (30%)
    const platformFee = Math.round(amount * 0.3);
    const sellerPayout = amount - platformFee;

    // Create transfer to seller
    const transfer = await stripe.transfers.create({
      amount: sellerPayout,
      currency: 'usd',
      destination: seller.stripe_account_id,
      metadata: {
        template_id: templateId,
        purchase_id: purchaseId,
        seller_id: sellerId,
      },
      description: `Payout for template sale: ${templateId}`,
    });

    // Record payout in database
    await supabase
      .from('payouts')
      .insert({
        seller_id: sellerId,
        template_id: templateId,
        purchase_id: purchaseId,
        amount: sellerPayout / 100, // Convert from cents
        platform_fee: platformFee / 100,
        stripe_transfer_id: transfer.id,
        status: 'completed',
        created_at: new Date().toISOString(),
      });

    // Update seller's balance
    await supabase.rpc('increment_seller_balance', {
      p_seller_id: sellerId,
      p_amount: sellerPayout / 100,
    });

    return NextResponse.json({ 
      success: true,
      transfer_id: transfer.id,
      amount: sellerPayout / 100,
    });
  } catch (error: any) {
    console.error('Payout error:', error);
    
    // Record failed payout attempt
    const { purchaseId, sellerId } = await req.json();
    const supabase = await createClient();
    
    await supabase
      .from('payouts')
      .insert({
        seller_id: sellerId,
        purchase_id: purchaseId,
        status: 'failed',
        error_message: error.message,
        created_at: new Date().toISOString(),
      });

    return NextResponse.json(
      { error: 'Failed to process payout' },
      { status: 500 }
    );
  }
}

// Get payout history
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: payouts } = await supabase
      .from('payouts')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    // Get balance
    const { data: seller } = await supabase
      .from('sellers')
      .select('balance, total_earnings')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      payouts,
      balance: seller?.balance || 0,
      total_earnings: seller?.total_earnings || 0,
    });
  } catch (error: any) {
    console.error('Get payouts error:', error);
    return NextResponse.json(
      { error: 'Failed to get payout history' },
      { status: 500 }
    );
  }
}