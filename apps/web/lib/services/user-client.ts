import { createClient } from '@/lib/auth/supabase-client';
import { PRICING_PLANS } from '@/lib/config/pricing';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  company_name?: string;
  role: 'user' | 'admin' | 'super_admin';
  subscription_status: 'trialing' | 'active' | 'canceled' | 'past_due' | 'paused';
  subscription_plan: 'free' | 'starter' | 'growth' | 'scale' | 'enterprise';
  billing_period: 'monthly' | 'annual';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_period_start?: string;
  current_period_end?: string;
  trial_end?: string;
  ai_generations_used: number;
  ai_generations_limit: number;
  projects_count: number;
  projects_limit: number;
  team_members_count: number;
  team_members_limit: number;
  cache_hits: number;
  total_requests: number;
  onboarding_completed: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return null;
    }

    // Get user profile from user_profiles table
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      
      // If profile doesn't exist, create one
      if (profileError.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || '',
            company_name: user.user_metadata?.company_name || '',
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating user profile:', createError);
          return null;
        }

        return formatUserProfile(newProfile, user);
      }
      
      return null;
    }

    return formatUserProfile(profile, user);
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}

function formatUserProfile(profile: any, user: any): UserProfile {
  const plan = profile?.subscription_plan || 'starter';
  const planConfig = PRICING_PLANS[plan as keyof typeof PRICING_PLANS] || PRICING_PLANS.starter;
  
  return {
    id: profile?.id || user.id,
    email: profile?.email || user.email || '',
    full_name: profile?.full_name || user.user_metadata?.full_name || '',
    avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
    company_name: profile?.company_name || user.user_metadata?.company_name,
    role: profile?.role || 'user',
    subscription_status: profile?.subscription_status || 'trialing',
    subscription_plan: plan,
    billing_period: profile?.billing_period || 'monthly',
    stripe_customer_id: profile?.stripe_customer_id,
    stripe_subscription_id: profile?.stripe_subscription_id,
    current_period_start: profile?.current_period_start,
    current_period_end: profile?.current_period_end || profile?.trial_end,
    trial_end: profile?.trial_end,
    ai_generations_used: profile?.ai_generations_used || 0,
    ai_generations_limit: (planConfig.limits as any).aiGenerations || -1,
    projects_count: profile?.projects_count || 0,
    projects_limit: planConfig.limits.projects,
    team_members_count: profile?.team_members_count || 0,
    team_members_limit: (planConfig.limits as any).teamMembers || -1,
    cache_hits: profile?.cache_hits || 0,
    total_requests: profile?.total_requests || 0,
    onboarding_completed: profile?.onboarding_completed || false,
    email_verified: profile?.email_verified || false,
    created_at: profile?.created_at || user.created_at,
    updated_at: profile?.updated_at || profile?.created_at || user.created_at,
  };
}

export async function updateUserProfile(updates: Partial<UserProfile>) {
  try {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

export async function checkSubscriptionStatus() {
  try {
    const profile = await getUserProfile();
    if (!profile) return null;

    // Check if trial has expired
    if (profile.subscription_status === 'trialing' && profile.trial_end) {
      const trialEndDate = new Date(profile.trial_end);
      const now = new Date();
      
      if (now > trialEndDate) {
        // Trial has expired, update status
        await updateUserProfile({ subscription_status: 'canceled' });
        return { ...profile, subscription_status: 'canceled' as const };
      }
    }

    return profile;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return null;
  }
}

export async function getUsageStats() {
  try {
    const profile = await getUserProfile();
    if (!profile) return null;

    const plan = PRICING_PLANS[profile.subscription_plan as keyof typeof PRICING_PLANS];
    
    return {
      aiGenerations: {
        used: profile.ai_generations_used,
        limit: (plan.limits as any).aiGenerations || -1,
        percentage: (plan.limits as any).aiGenerations ? (profile.ai_generations_used / (plan.limits as any).aiGenerations) * 100 : 0,
      },
      projects: {
        used: profile.projects_count,
        limit: plan.limits.projects,
        percentage: (profile.projects_count / plan.limits.projects) * 100,
      },
      teamMembers: {
        used: profile.team_members_count,
        limit: (plan.limits as any).teamMembers || -1,
        percentage: (plan.limits as any).teamMembers ? (profile.team_members_count / (plan.limits as any).teamMembers) * 100 : 0,
      },
      cacheHitRate: profile.total_requests > 0 
        ? (profile.cache_hits / profile.total_requests) * 100 
        : 0,
    };
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return null;
  }
}

export function subscribeToProfileChanges(callback: (profile: UserProfile) => void) {
  const supabase = createClient();
  
  const subscription = supabase
    .channel('profile-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_profiles',
      filter: `id=eq.${supabase.auth.getUser().then(u => u.data.user?.id)}`
    }, async () => {
      const profile = await getUserProfile();
      if (profile) callback(profile);
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}

export async function checkUsageLimits() {
  try {
    const profile = await getUserProfile();
    if (!profile) return { withinLimits: true, warnings: [] };

    const plan = PRICING_PLANS[profile.subscription_plan as keyof typeof PRICING_PLANS];
    const warnings: string[] = [];

    // Check AI generations
    const aiLimit = (plan.limits as any).aiGenerations;
    if (aiLimit && aiLimit !== -1 && profile.ai_generations_used >= aiLimit * 0.8) {
      warnings.push(`You've used ${Math.round((profile.ai_generations_used / aiLimit) * 100)}% of your AI generation limit`);
    }

    // Check projects
    if (plan.limits.projects && plan.limits.projects !== -1 && profile.projects_count >= plan.limits.projects * 0.8) {
      warnings.push(`You've used ${Math.round((profile.projects_count / plan.limits.projects) * 100)}% of your project limit`);
    }

    return {
      withinLimits: (!aiLimit || aiLimit === -1 || profile.ai_generations_used < aiLimit) &&
                   (!plan.limits.projects || plan.limits.projects === -1 || profile.projects_count < plan.limits.projects),
      warnings
    };
  } catch (error) {
    console.error('Error checking usage limits:', error);
    return { withinLimits: true, warnings: [] };
  }
}

export async function trackUsage(metric: string, quantity: number = 1) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update the appropriate counter in user_profiles
    const updates: any = {};
    if (metric === 'ai_generation') {
      updates.ai_generations_used = quantity;
    } else if (metric === 'project') {
      updates.projects_count = quantity;
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);
    }

    // Also log to usage_logs table if it exists
    await supabase
      .from('usage_logs')
      .insert({
        user_id: user.id,
        metric,
        quantity,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
}

export async function logActivity(action: string, resourceType?: string, resourceId?: string, metadata?: any) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}