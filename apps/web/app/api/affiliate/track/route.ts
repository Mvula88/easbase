import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';

// Track affiliate clicks and conversions
export async function POST(req: NextRequest) {
  try {
    const { 
      affiliate_code,
      event_type, // 'click' | 'signup' | 'purchase'
      source,
      metadata 
    } = await req.json();

    if (!affiliate_code) {
      return NextResponse.json({ error: 'No affiliate code provided' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get affiliate
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, user_id')
      .eq('affiliate_code', affiliate_code)
      .eq('status', 'active')
      .single();

    if (!affiliate) {
      return NextResponse.json({ error: 'Invalid affiliate code' }, { status: 404 });
    }

    // Track based on event type
    switch (event_type) {
      case 'click': {
        // Record click
        await supabase
          .from('affiliate_referrals')
          .upsert({
            affiliate_id: affiliate.id,
            source: source || 'direct',
            clicks: 1,
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
            user_agent: req.headers.get('user-agent'),
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'affiliate_id,source,ip_address',
            count: 'exact',
          });

        // Set cookie for 30 days
        const response = NextResponse.json({ success: true });
        response.cookies.set('easbase_ref', affiliate_code, {
          maxAge: 30 * 24 * 60 * 60, // 30 days
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });

        return response;
      }

      case 'signup': {
        const { user_id } = metadata;
        
        // Record conversion
        await supabase
          .from('affiliate_referrals')
          .insert({
            affiliate_id: affiliate.id,
            referred_user_id: user_id,
            source: source || 'direct',
            status: 'converted',
            converted_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });

        // Create pending commission (paid after first purchase)
        await supabase
          .from('affiliate_commissions')
          .insert({
            affiliate_id: affiliate.id,
            referred_user_id: user_id,
            type: 'signup_bonus',
            amount: 5, // $5 signup bonus
            status: 'pending',
            created_at: new Date().toISOString(),
          });

        return NextResponse.json({ 
          success: true,
          message: 'Conversion tracked' 
        });
      }

      case 'purchase': {
        const { user_id, amount, product_type, product_id } = metadata;
        
        // Check if user was referred
        const { data: referral } = await supabase
          .from('affiliate_referrals')
          .select('affiliate_id')
          .eq('referred_user_id', user_id)
          .single();

        if (!referral) {
          return NextResponse.json({ 
            success: false,
            message: 'User not referred' 
          });
        }

        // Calculate commission (20% for templates, 30% for subscriptions)
        const commissionRate = product_type === 'subscription' ? 0.30 : 0.20;
        const commissionAmount = amount * commissionRate;

        // Create commission record
        await supabase
          .from('affiliate_commissions')
          .insert({
            affiliate_id: referral.affiliate_id,
            referred_user_id: user_id,
            type: product_type,
            product_id,
            sale_amount: amount,
            amount: commissionAmount,
            status: 'pending', // Becomes 'paid' after 30 days (refund period)
            created_at: new Date().toISOString(),
          });

        // Update affiliate's pending balance
        await supabase.rpc('increment_affiliate_balance', {
          p_affiliate_id: referral.affiliate_id,
          p_amount: commissionAmount,
          p_type: 'pending',
        });

        return NextResponse.json({ 
          success: true,
          commission: commissionAmount,
          message: 'Purchase tracked' 
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Track affiliate error:', error);
    return NextResponse.json(
      { error: 'Failed to track affiliate event' },
      { status: 500 }
    );
  }
}