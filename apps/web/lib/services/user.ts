import { createClient } from '@/lib/auth/supabase-server';
import { createClient as createClientClient } from '@/lib/auth/supabase-client';
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

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  subscription_plan: string;
  billing_period: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  metadata?: any;
  created_at: string;
}

class UserService {
  async getCurrentUser() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return user;
  }

  async getUserProfile(userId?: string) {
    const supabase = await createClient();
    
    if (!userId) {
      const user = await this.getCurrentUser();
      if (!user) return null;
      userId = user.id;
    }
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return profile as UserProfile;
  }

  async updateUserProfile(updates: Partial<UserProfile>) {
    const supabase = await createClient();
    const user = await this.getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
    
    return data as UserProfile;
  }

  async getUserOrganizations(userId?: string) {
    const supabase = await createClient();
    
    if (!userId) {
      const user = await this.getCurrentUser();
      if (!user) return [];
      userId = user.id;
    }
    
    // Get organizations where user is owner
    const { data: ownedOrgs } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', userId);
    
    // Get organizations where user is a team member
    const { data: memberOrgs } = await supabase
      .from('organization_members')
      .select('organization:organizations(*)')
      .eq('user_id', userId);
    
    const allOrgs = [
      ...(ownedOrgs || []),
      ...(memberOrgs?.map(m => m.organization).filter(Boolean) || [])
    ];
    
    // Remove duplicates
    const uniqueOrgs = Array.from(
      new Map(allOrgs.map(org => [org.id, org])).values()
    );
    
    return uniqueOrgs as Organization[];
  }

  async getActivityLogs(limit = 10) {
    const supabase = await createClient();
    const user = await this.getCurrentUser();
    
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching activity logs:', error);
      return [];
    }
    
    return data as ActivityLog[];
  }

  async trackUsage(type: 'ai_generation' | 'project_created' | 'cache_hit' | 'request') {
    const supabase = await createClient();
    const user = await this.getCurrentUser();
    
    if (!user) return;
    
    const profile = await this.getUserProfile(user.id);
    if (!profile) return;
    
    const updates: Partial<UserProfile> = {};
    
    switch (type) {
      case 'ai_generation':
        updates.ai_generations_used = (profile.ai_generations_used || 0) + 1;
        break;
      case 'project_created':
        updates.projects_count = (profile.projects_count || 0) + 1;
        break;
      case 'cache_hit':
        updates.cache_hits = (profile.cache_hits || 0) + 1;
        break;
      case 'request':
        updates.total_requests = (profile.total_requests || 0) + 1;
        break;
    }
    
    await this.updateUserProfile(updates);
  }

  async checkUsageLimits(type: 'ai_generation' | 'project' | 'team_member'): Promise<boolean> {
    const profile = await this.getUserProfile();
    if (!profile) return false;
    
    switch (type) {
      case 'ai_generation':
        return profile.ai_generations_used < profile.ai_generations_limit;
      case 'project':
        return profile.projects_count < profile.projects_limit;
      case 'team_member':
        return profile.team_members_count < profile.team_members_limit;
      default:
        return false;
    }
  }

  async logActivity(action: string, resourceType?: string, resourceId?: string, metadata?: any) {
    const supabase = await createClient();
    const user = await this.getCurrentUser();
    
    if (!user) return;
    
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata
      });
  }

  // Client-side method for real-time subscription updates
  subscribeToProfileChanges(userId: string, callback: (profile: UserProfile) => void) {
    const supabase = createClientClient();
    
    const subscription = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          if (payload.new) {
            callback(payload.new as UserProfile);
          }
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }
}

export const userService = new UserService();

// Export individual methods for direct imports
export const subscribeToProfileChanges = userService.subscribeToProfileChanges.bind(userService);
export const checkUsageLimits = userService.checkUsageLimits.bind(userService);
export const trackUsage = userService.trackUsage.bind(userService);
export const logActivity = userService.logActivity.bind(userService);