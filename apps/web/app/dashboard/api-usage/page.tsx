'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/auth/supabase-client';
import { useRouter } from 'next/navigation';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  BarChart3,
  Clock,
  Zap,
  Database,
  Calendar,
  Download
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface UsageData {
  apiCalls: number;
  apiLimit: number;
  storageUsed: number;
  storageLimit: number;
  bandwidthUsed: number;
  bandwidthLimit: number;
  databaseSize: number;
  databaseLimit: number;
}

interface DailyUsage {
  date: string;
  calls: number;
}

export default function ApiUsagePage() {
  const [usage, setUsage] = useState<UsageData>({
    apiCalls: 0,
    apiLimit: 10000,
    storageUsed: 0,
    storageLimit: 10,
    bandwidthUsed: 0,
    bandwidthLimit: 100,
    databaseSize: 0,
    databaseLimit: 5
  });
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadUsageData();
  }, [period]);

  const loadUsageData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Load user profile for limits
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_plan, total_requests')
        .eq('id', user.id)
        .single();

      // Calculate date range based on period
      const endDate = new Date();
      let startDate = new Date();
      if (period === 'day') {
        startDate = subDays(endDate, 1);
      } else if (period === 'week') {
        startDate = subDays(endDate, 7);
      } else {
        startDate = subDays(endDate, 30);
      }

      // Load API usage
      const { data: apiUsage } = await supabase
        .from('api_usage')
        .select('created_at, request_count')
        .eq('customer_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Calculate total API calls
      const totalCalls = apiUsage?.reduce((sum, record) => sum + (record.request_count || 1), 0) || 0;

      // Mock storage and bandwidth data (in production, these would come from real sources)
      setUsage({
        apiCalls: totalCalls,
        apiLimit: getApiLimit(profile?.subscription_plan || 'free'),
        storageUsed: Math.random() * 5, // Mock data
        storageLimit: 10,
        bandwidthUsed: Math.random() * 50, // Mock data
        bandwidthLimit: 100,
        databaseSize: Math.random() * 2, // Mock data
        databaseLimit: 5
      });

      // Group usage by day for chart
      const usageByDay: Record<string, number> = {};
      apiUsage?.forEach(record => {
        const day = format(new Date(record.created_at), 'yyyy-MM-dd');
        usageByDay[day] = (usageByDay[day] || 0) + (record.request_count || 1);
      });

      // Convert to array format
      const dailyData: DailyUsage[] = [];
      for (let i = period === 'day' ? 0 : (period === 'week' ? 6 : 29); i >= 0; i--) {
        const date = format(subDays(endDate, i), 'yyyy-MM-dd');
        dailyData.push({
          date,
          calls: usageByDay[date] || 0
        });
      }
      setDailyUsage(dailyData);

    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getApiLimit = (plan: string): number => {
    switch (plan) {
      case 'starter': return 50000;
      case 'professional': return 500000;
      case 'business': return 2000000;
      default: return 10000;
    }
  };

  const getUsagePercentage = (used: number, limit: number): number => {
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage < 50) return 'text-green-600';
    if (percentage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">API Usage</h1>
          <p className="text-gray-600 mt-2">Monitor your resource consumption and limits</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={period === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('day')}
          >
            24h
          </Button>
          <Button
            variant={period === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('week')}
          >
            7 days
          </Button>
          <Button
            variant={period === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('month')}
          >
            30 days
          </Button>
        </div>
      </div>

      {/* Usage Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">API Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${getUsageColor(getUsagePercentage(usage.apiCalls, usage.apiLimit))}`}>
                  {usage.apiCalls.toLocaleString()}
                </span>
                <span className="text-sm text-gray-500">/ {usage.apiLimit.toLocaleString()}</span>
              </div>
              <Progress value={getUsagePercentage(usage.apiCalls, usage.apiLimit)} className="h-2" />
              <div className="flex items-center text-xs text-gray-500">
                <Activity className="w-3 h-3 mr-1" />
                {getUsagePercentage(usage.apiCalls, usage.apiLimit).toFixed(1)}% used
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Storage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${getUsageColor(getUsagePercentage(usage.storageUsed, usage.storageLimit))}`}>
                  {usage.storageUsed.toFixed(1)}
                </span>
                <span className="text-sm text-gray-500">/ {usage.storageLimit} GB</span>
              </div>
              <Progress value={getUsagePercentage(usage.storageUsed, usage.storageLimit)} className="h-2" />
              <div className="flex items-center text-xs text-gray-500">
                <Database className="w-3 h-3 mr-1" />
                {getUsagePercentage(usage.storageUsed, usage.storageLimit).toFixed(1)}% used
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Bandwidth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${getUsageColor(getUsagePercentage(usage.bandwidthUsed, usage.bandwidthLimit))}`}>
                  {usage.bandwidthUsed.toFixed(1)}
                </span>
                <span className="text-sm text-gray-500">/ {usage.bandwidthLimit} GB</span>
              </div>
              <Progress value={getUsagePercentage(usage.bandwidthUsed, usage.bandwidthLimit)} className="h-2" />
              <div className="flex items-center text-xs text-gray-500">
                <Zap className="w-3 h-3 mr-1" />
                {getUsagePercentage(usage.bandwidthUsed, usage.bandwidthLimit).toFixed(1)}% used
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Database</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${getUsageColor(getUsagePercentage(usage.databaseSize, usage.databaseLimit))}`}>
                  {usage.databaseSize.toFixed(1)}
                </span>
                <span className="text-sm text-gray-500">/ {usage.databaseLimit} GB</span>
              </div>
              <Progress value={getUsagePercentage(usage.databaseSize, usage.databaseLimit)} className="h-2" />
              <div className="flex items-center text-xs text-gray-500">
                <Database className="w-3 h-3 mr-1" />
                {getUsagePercentage(usage.databaseSize, usage.databaseLimit).toFixed(1)}% used
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>API Calls Over Time</CardTitle>
          <CardDescription>
            Daily API call volume for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end gap-1">
            {dailyUsage.map((day, index) => {
              const maxCalls = Math.max(...dailyUsage.map(d => d.calls), 1);
              const height = (day.calls / maxCalls) * 100;
              
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center"
                >
                  <div className="w-full bg-cyan-500 hover:bg-cyan-600 transition-colors rounded-t"
                    style={{ height: `${height}%` }}
                    title={`${format(new Date(day.date), 'MMM d')}: ${day.calls} calls`}
                  />
                  {(period === 'week' || (period === 'month' && index % 5 === 0)) && (
                    <span className="text-xs text-gray-500 mt-2">
                      {format(new Date(day.date), period === 'week' ? 'EEE' : 'd')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Usage Alerts */}
      {getUsagePercentage(usage.apiCalls, usage.apiLimit) > 80 && (
        <Card className="mt-6 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900">Approaching API Limit</h3>
                <p className="text-sm text-yellow-800 mt-1">
                  You've used {getUsagePercentage(usage.apiCalls, usage.apiLimit).toFixed(0)}% of your monthly API calls.
                  Consider upgrading your plan to avoid service interruption.
                </p>
                <Button size="sm" className="mt-3" onClick={() => router.push('/pricing')}>
                  Upgrade Plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}