import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';
import { getBackendOrchestrator } from '@/lib/services/backend-orchestrator';
import { PRICING_PLANS } from '@/lib/config/pricing';

// GET /api/billing/usage - Get usage statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') as 'day' | 'week' | 'month' || 'month';

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile with subscription info
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const plan = PRICING_PLANS[profile.subscription_plan as keyof typeof PRICING_PLANS];
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    if (period === 'day') {
      startDate.setDate(startDate.getDate() - 1);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // Get usage metrics
    const orchestrator = await getBackendOrchestrator();
    const billingService = orchestrator.getBillingService();

    // Get MAU (Monthly Active Users)
    const { data: activeUsers } = await supabase
      .from('auth.users')
      .select('count')
      .gte('last_sign_in_at', startDate.toISOString())
      .single();

    // Get email usage
    const { data: emailsSent } = await supabase
      .from('email_logs')
      .select('count')
      .gte('sent_at', startDate.toISOString())
      .single();

    // Get SMS usage
    const { data: smsSent } = await supabase
      .from('sms_logs')
      .select('count')
      .gte('sent_at', startDate.toISOString())
      .single();

    // Get storage usage
    const { data: storageObjects } = await supabase
      .from('storage.objects')
      .select('metadata->size')
      .eq('owner', user.id);

    const storageUsedBytes = storageObjects?.reduce((acc: number, obj: any) => 
      acc + (parseInt(obj?.['metadata->size'] || '0')), 0) || 0;
    const storageUsedGB = Math.round(storageUsedBytes / (1024 * 1024 * 1024) * 10) / 10;

    // Get bandwidth usage (simplified - count downloads)
    const { data: bandwidthLogs } = await supabase
      .from('storage_access_logs')
      .select('count')
      .gte('accessed_at', startDate.toISOString())
      .single();

    const usage: any = {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      metrics: {
        mau: {
          used: activeUsers?.count || 0,
          limit: (plan.limits as any)?.mau || 0,
          percentage: (plan.limits as any)?.mau ? ((activeUsers?.count || 0) / (plan.limits as any).mau) * 100 : 0,
        },
        emails: {
          used: emailsSent?.count || 0,
          limit: (plan.limits as any)?.emails || 0,
          percentage: (plan.limits as any)?.emails ? ((emailsSent?.count || 0) / (plan.limits as any).emails) * 100 : 0,
        },
        sms: {
          used: smsSent?.count || 0,
          limit: (plan.limits as any)?.sms || 0,
          percentage: (plan.limits as any)?.sms ? ((smsSent?.count || 0) / (plan.limits as any).sms) * 100 : 0,
        },
        storage: {
          used: storageUsedGB,
          limit: (plan.limits as any)?.storage || 0,
          percentage: (plan.limits as any)?.storage ? (storageUsedGB / (plan.limits as any).storage) * 100 : 0,
          unit: 'GB',
        },
        bandwidth: {
          used: (bandwidthLogs?.count || 0) * 0.001, // Rough estimate: 1MB per access
          limit: (plan.limits as any)?.bandwidth || 0,
          percentage: (plan.limits as any)?.bandwidth ? ((bandwidthLogs?.count || 0) * 0.001 / (plan.limits as any).bandwidth) * 100 : 0,
          unit: 'GB',
        },
        projects: {
          used: profile.projects_count || 0,
          limit: plan.limits?.projects || 0,
          percentage: plan.limits?.projects && plan.limits.projects > 0 
            ? ((profile.projects_count || 0) / plan.limits.projects) * 100 
            : 0,
        },
      },
      alerts: [],
    };

    // Add usage alerts
    Object.entries(usage.metrics).forEach(([key, metric]: [string, any]) => {
      if (metric.percentage >= 90) {
        usage.alerts.push({
          type: 'warning',
          metric: key,
          message: `You've used ${Math.round(metric.percentage)}% of your ${key} limit`,
        });
      } else if (metric.percentage >= 100) {
        usage.alerts.push({
          type: 'error',
          metric: key,
          message: `You've exceeded your ${key} limit`,
        });
      }
    });

    return NextResponse.json(usage);
  } catch (error: any) {
    console.error('Get usage error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/billing/usage - Track usage event
export async function POST(request: NextRequest) {
  try {
    const { metric, quantity = 1, metadata } = await request.json();

    if (!metric) {
      return NextResponse.json(
        { error: 'Metric is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's customer ID and usage counters
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, emails_sent, sms_sent')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      // User doesn't have billing set up yet, just log locally
      const { error } = await supabase
        .from('usage_logs')
        .insert({
          user_id: user.id,
          metric,
          quantity,
          metadata,
          timestamp: new Date().toISOString(),
        });

      if (error) {
        console.error('Usage tracking error:', error);
      }

      return NextResponse.json({ 
        success: true,
        message: 'Usage tracked locally',
      });
    }

    // Track usage with orchestrator
    const orchestrator = await getBackendOrchestrator();
    const billingService = orchestrator.getBillingService();
    
    const result = await billingService.trackUsage({
      customerId: profile.stripe_customer_id,
      metric,
      quantity,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to track usage' },
        { status: 400 }
      );
    }

    // Update profile counters based on metric
    const updates: any = {};
    if (metric === 'email_sent') {
      updates.emails_sent = ((profile as any).emails_sent || 0) + quantity;
    } else if (metric === 'sms_sent') {
      updates.sms_sent = ((profile as any).sms_sent || 0) + quantity;
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Usage tracked successfully',
    });
  } catch (error: any) {
    console.error('Track usage error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}