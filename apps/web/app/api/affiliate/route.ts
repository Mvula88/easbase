import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';
import { nanoid } from 'nanoid';

// Create or get affiliate account
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if already an affiliate
    const { data: existingAffiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingAffiliate) {
      return NextResponse.json({ affiliate: existingAffiliate });
    }

    // Generate unique affiliate code
    const affiliateCode = `EAS${nanoid(8).toUpperCase()}`;
    
    // Create affiliate account
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .insert({
        user_id: user.id,
        email: user.email,
        affiliate_code: affiliateCode,
        commission_rate: 20, // 20% commission
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Generate marketing materials
    const materials = {
      referral_link: `${process.env.NEXT_PUBLIC_APP_URL}?ref=${affiliateCode}`,
      banners: [
        `${process.env.NEXT_PUBLIC_APP_URL}/banners/728x90.png`,
        `${process.env.NEXT_PUBLIC_APP_URL}/banners/300x250.png`,
        `${process.env.NEXT_PUBLIC_APP_URL}/banners/160x600.png`,
      ],
      email_templates: [
        {
          subject: '🚀 Build Backends in 45 Seconds with AI',
          body: `Hey there!\n\nI've been using Easbase to build backends for my projects and it's incredible. You can literally describe your app in plain English and get a complete backend with database, APIs, and auth in 45 seconds!\n\nCheck it out: ${process.env.NEXT_PUBLIC_APP_URL}?ref=${affiliateCode}\n\nThey have templates for Uber, Airbnb, and more. Plus you can sell your own templates and earn 70% revenue share.\n\nHighly recommend giving it a try!`,
        },
      ],
    };

    return NextResponse.json({ 
      affiliate,
      materials,
      message: 'Welcome to the Easbase Affiliate Program!' 
    });
  } catch (error: any) {
    console.error('Create affiliate error:', error);
    return NextResponse.json(
      { error: 'Failed to create affiliate account' },
      { status: 500 }
    );
  }
}

// Get affiliate dashboard data
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get affiliate account
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!affiliate) {
      return NextResponse.json({ error: 'Not an affiliate' }, { status: 404 });
    }

    // Get referral stats
    const { data: referrals } = await supabase
      .from('affiliate_referrals')
      .select('*')
      .eq('affiliate_id', affiliate.id);

    // Get commission history
    const { data: commissions } = await supabase
      .from('affiliate_commissions')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false });

    // Calculate stats
    const stats = {
      total_clicks: referrals?.reduce((sum, r) => sum + (r.clicks || 0), 0) || 0,
      total_signups: referrals?.filter(r => r.status === 'converted').length || 0,
      total_sales: commissions?.filter(c => c.status === 'paid').length || 0,
      total_earnings: commissions?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0,
      pending_earnings: commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.amount || 0), 0) || 0,
      conversion_rate: referrals?.length ? 
        ((referrals.filter(r => r.status === 'converted').length / referrals.length) * 100).toFixed(2) : 0,
    };

    // Get top performing content
    const topContent = await supabase
      .from('affiliate_referrals')
      .select('source, COUNT(*)')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'converted')
      .limit(5);

    return NextResponse.json({
      affiliate,
      stats,
      referrals,
      commissions,
      topContent,
      materials: {
        referral_link: `${process.env.NEXT_PUBLIC_APP_URL}?ref=${affiliate.affiliate_code}`,
        dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/affiliate/dashboard`,
      },
    });
  } catch (error: any) {
    console.error('Get affiliate data error:', error);
    return NextResponse.json(
      { error: 'Failed to get affiliate data' },
      { status: 500 }
    );
  }
}