import { redirect } from 'next/navigation';
import { createClient } from '@/lib/auth/supabase-server';
import { userService } from '@/lib/services/user';
import { PRICING_PLANS } from '@/lib/config/pricing';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/login');
  }

  // Fetch user profile directly from Supabase to ensure fresh data
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (!profile) {
    // If no profile exists, redirect to onboarding
    redirect('/onboarding');
  }
  
  // Check if onboarding is completed (explicit check for true)
  if (profile.onboarding_completed !== true) {
    console.log('Onboarding not completed for user:', user.id, 'Status:', profile.onboarding_completed);
    redirect('/onboarding');
  }

  // Fetch user's backend projects
  const { data: projects } = await supabase
    .from('customer_projects')
    .select('*')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });
  
  // Count active backends
  const activeBackends = projects?.filter(p => p.status === 'active').length || 0;
  
  // Fetch API usage for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data: apiUsage } = await supabase
    .from('api_usage')
    .select('*')
    .eq('customer_id', user.id)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });
  
  const apiCallsToday = apiUsage?.reduce((sum, usage) => sum + (usage.request_count || 0), 0) || 0;
  
  // Calculate total database size (mock for now, would come from Supabase Management API)
  const totalDatabaseSize = projects?.reduce((sum, project) => {
    // In production, this would query each project's actual database size
    return sum + (project.metadata?.database_size || 0.1); // Mock 0.1 GB per project
  }, 0) || 0;
  
  // Fetch recent deployments
  const { data: recentDeployments } = await supabase
    .from('project_deployments')
    .select('*, customer_projects!inner(project_name)')
    .eq('customer_projects.customer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Prepare data for client component
  const dashboardData = {
    user: {
      id: user.id,
      email: user.email!,
      name: profile.full_name || user.email!.split('@')[0],
      company: profile.company_name || '',
      avatar: profile.avatar_url || '',
    },
    subscription: {
      plan: profile.subscription_plan || 'free',
      status: profile.subscription_status || 'active',
      billingPeriod: profile.billing_period || 'monthly',
      currentPeriodEnd: profile.current_period_end,
      trialEnd: profile.trial_end,
    },
    backends: {
      total: projects?.length || 0,
      active: activeBackends,
      limit: (PRICING_PLANS as any)[profile.subscription_plan || 'starter']?.limits?.projects || 3,
    },
    usage: {
      apiCallsToday: apiCallsToday,
      apiCallsLimit: (PRICING_PLANS as any)[profile.subscription_plan || 'starter']?.limits?.apiCalls || 10000,
      databaseSize: totalDatabaseSize,
      databaseLimit: (PRICING_PLANS as any)[profile.subscription_plan || 'starter']?.limits?.storage || 10,
    },
    projects: projects || [],
    recentDeployments: recentDeployments || [],
  };

  return <DashboardClient initialData={dashboardData} />;
}