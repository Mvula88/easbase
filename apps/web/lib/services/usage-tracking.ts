import { createServiceClient } from '@/lib/auth/supabase';

export interface UsageTrackingResult {
  success: boolean;
  error?: string;
  usage?: {
    current: number;
    limit: number;
    remaining: number;
  };
}

export async function trackUsage(
  customerId: string, 
  usageType: 'schema_generation' | 'deployment' | 'api_call',
  metadata?: any
): Promise<UsageTrackingResult> {
  try {
    const supabase = await createServiceClient();
    
    // Get customer's current plan and usage
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('subscription_tier, subscription_status')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return {
        success: false,
        error: 'Customer not found'
      };
    }

    // Get plan limits
    const planLimits = getPlanLimits(customer.subscription_tier || 'free');
    
    // Get current month's usage
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const { data: usageData, error: usageError } = await supabase
      .from('usage_tracking')
      .select('count')
      .eq('customer_id', customerId)
      .eq('usage_type', usageType)
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString());

    if (usageError) {
      console.error('Usage tracking error:', usageError);
    }

    const currentUsage = usageData?.reduce((sum: number, item: any) => sum + (item.count || 1), 0) || 0;
    
    // Check if within limits
    if (currentUsage >= planLimits[usageType]) {
      return {
        success: false,
        error: 'Usage limit exceeded. Please upgrade your plan.',
        usage: {
          current: currentUsage,
          limit: planLimits[usageType],
          remaining: 0
        }
      };
    }

    // Track the new usage
    const { error: insertError } = await supabase
      .from('usage_tracking')
      .insert({
        customer_id: customerId,
        usage_type: usageType,
        count: 1,
        metadata,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Failed to track usage:', insertError);
    }

    return {
      success: true,
      usage: {
        current: currentUsage + 1,
        limit: planLimits[usageType],
        remaining: planLimits[usageType] - (currentUsage + 1)
      }
    };
  } catch (error) {
    console.error('Usage tracking error:', error);
    return {
      success: false,
      error: 'Failed to track usage'
    };
  }
}

export async function getUsageStats(customerId: string, period: 'day' | 'week' | 'month' = 'month') {
  const supabase = await createServiceClient();
  
  let startDate = new Date();
  
  switch (period) {
    case 'day':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      break;
  }

  const { data, error } = await supabase
    .from('usage_tracking')
    .select('usage_type, count, created_at')
    .eq('customer_id', customerId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get usage stats:', error);
    return null;
  }

  // Aggregate by type
  const stats = data?.reduce((acc: any, item: any) => {
    if (!acc[item.usage_type]) {
      acc[item.usage_type] = 0;
    }
    acc[item.usage_type] += item.count || 1;
    return acc;
  }, {} as Record<string, number>);

  return stats;
}

function getPlanLimits(tier: string) {
  const limits: Record<string, any> = {
    free: {
      schema_generation: 5,
      deployment: 2,
      api_call: 100
    },
    starter: {
      schema_generation: 50,
      deployment: 10,
      api_call: 1000
    },
    growth: {
      schema_generation: 500,
      deployment: 50,
      api_call: 10000
    },
    scale: {
      schema_generation: 2000,
      deployment: 200,
      api_call: 100000
    },
    enterprise: {
      schema_generation: Infinity,
      deployment: Infinity,
      api_call: Infinity
    }
  };

  return limits[tier] || limits.free;
}

export async function enforceRateLimit(
  customerId: string,
  resource: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): Promise<boolean> {
  const supabase = await createServiceClient();
  
  const windowStart = new Date(Date.now() - windowMs);
  
  const { count, error } = await supabase
    .from('usage_tracking')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .eq('usage_type', `rate_limit_${resource}`)
    .gte('created_at', windowStart.toISOString());

  if (error) {
    console.error('Rate limit check error:', error);
    return false;
  }

  if ((count || 0) >= maxRequests) {
    return false; // Rate limit exceeded
  }

  // Track this request
  await supabase
    .from('usage_tracking')
    .insert({
      customer_id: customerId,
      usage_type: `rate_limit_${resource}`,
      count: 1,
      created_at: new Date().toISOString()
    });

  return true;
}