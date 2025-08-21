import { createServiceClient } from '@/lib/auth/supabase';

export interface UsageMetrics {
  tokensUsed: number;
  tokensLimit: number;
  tokensRemaining: number;
  deploymentsUsed: number;
  deploymentsLimit: number;
  deploymentsRemaining: number;
  projectsUsed: number;
  projectsLimit: number;
  projectsRemaining: number;
  percentageUsed: number;
}

export class UsageTracker {
  private supabase;

  constructor() {
    this.supabase = createServiceClient();
  }

  async getUserUsage(userId: string): Promise<UsageMetrics> {
    const supabase = await this.supabase;

    // Get current usage
    const { data: usage } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!usage) {
      // Initialize usage for new user
      const { data: newUsage } = await supabase
        .from('user_usage')
        .insert({
          user_id: userId,
          tokens_used: 0,
          tokens_limit: 10000, // Free tier
          deployments_used: 0,
          deployments_limit: 5,
          projects_count: 0,
          projects_limit: 1,
        })
        .select()
        .single();

      return this.formatUsageMetrics(newUsage);
    }

    return this.formatUsageMetrics(usage);
  }

  async trackTokenUsage(userId: string, tokens: number): Promise<void> {
    const supabase = await this.supabase;

    await supabase.rpc('increment_token_usage', {
      p_user_id: userId,
      p_tokens: tokens,
    });

    // Log usage
    await supabase.from('usage_logs').insert({
      user_id: userId,
      type: 'tokens',
      amount: tokens,
      created_at: new Date().toISOString(),
    });
  }

  async trackDeployment(userId: string, projectId: string): Promise<void> {
    const supabase = await this.supabase;

    await supabase.rpc('increment_deployment_usage', {
      p_user_id: userId,
    });

    // Log deployment
    await supabase.from('usage_logs').insert({
      user_id: userId,
      type: 'deployment',
      amount: 1,
      metadata: { project_id: projectId },
      created_at: new Date().toISOString(),
    });
  }

  async checkTokenLimit(userId: string, requiredTokens: number): Promise<boolean> {
    const usage = await this.getUserUsage(userId);
    return usage.tokensRemaining >= requiredTokens;
  }

  async checkDeploymentLimit(userId: string): Promise<boolean> {
    const usage = await this.getUserUsage(userId);
    return usage.deploymentsRemaining > 0;
  }

  async checkProjectLimit(userId: string): Promise<boolean> {
    const usage = await this.getUserUsage(userId);
    return usage.projectsRemaining > 0;
  }

  async resetMonthlyUsage(): Promise<void> {
    const supabase = await this.supabase;

    // Reset monthly counters
    await supabase
      .from('user_usage')
      .update({
        tokens_used: 0,
        deployments_used: 0,
      })
      .gte('last_reset', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Update last reset timestamp
    await supabase
      .from('user_usage')
      .update({
        last_reset: new Date().toISOString(),
      })
      .gte('last_reset', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  }

  async getUsageHistory(userId: string, days = 30) {
    const supabase = await this.supabase;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data: logs } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    return logs || [];
  }

  async getUsageStats(userId: string) {
    const supabase = await this.supabase;

    // Get aggregated stats
    const { data: stats } = await supabase
      .from('usage_logs')
      .select('type, amount')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (!stats) return {};

    const aggregated = stats.reduce((acc: any, log) => {
      if (!acc[log.type]) {
        acc[log.type] = { total: 0, count: 0 };
      }
      acc[log.type].total += log.amount;
      acc[log.type].count += 1;
      return acc;
    }, {});

    return aggregated;
  }

  private formatUsageMetrics(usage: any): UsageMetrics {
    const tokensRemaining = Math.max(0, usage.tokens_limit - usage.tokens_used);
    const deploymentsRemaining = Math.max(0, usage.deployments_limit - usage.deployments_used);
    const projectsRemaining = Math.max(0, usage.projects_limit - usage.projects_count);

    return {
      tokensUsed: usage.tokens_used,
      tokensLimit: usage.tokens_limit,
      tokensRemaining,
      deploymentsUsed: usage.deployments_used,
      deploymentsLimit: usage.deployments_limit,
      deploymentsRemaining,
      projectsUsed: usage.projects_count,
      projectsLimit: usage.projects_limit,
      projectsRemaining,
      percentageUsed: Math.round((usage.tokens_used / usage.tokens_limit) * 100),
    };
  }
}