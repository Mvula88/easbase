'use client';

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  HardDrive, 
  Zap,
  TrendingUp,
  AlertCircle 
} from 'lucide-react';

interface UsageMetricsProps {
  usage: {
    apiCallsToday: number;
    apiCallsLimit: number;
    databaseSize: number;
    databaseLimit: number;
    bandwidthUsed?: number;
    bandwidthLimit?: number;
    aiTokensUsed?: number;
    aiTokensLimit?: number;
  };
  plan: string;
}

export function UsageMetrics({ usage, plan }: UsageMetricsProps) {
  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const metrics = [
    {
      name: 'API Calls Today',
      icon: Activity,
      used: usage.apiCallsToday,
      limit: usage.apiCallsLimit,
      unit: 'calls',
      color: 'blue',
    },
    {
      name: 'Database Size',
      icon: Database,
      used: usage.databaseSize,
      limit: usage.databaseLimit,
      unit: 'GB',
      color: 'purple',
    },
    {
      name: 'Bandwidth',
      icon: TrendingUp,
      used: usage.bandwidthUsed || 0,
      limit: usage.bandwidthLimit || 100,
      unit: 'GB',
      color: 'green',
    },
    {
      name: 'AI Tokens',
      icon: Zap,
      used: usage.aiTokensUsed || 0,
      limit: usage.aiTokensLimit || 10000,
      unit: 'tokens',
      color: 'orange',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Usage Metrics</h2>
        <span className="text-sm text-gray-500">
          Current Plan: <span className="font-semibold capitalize">{plan}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const percentage = getUsagePercentage(metric.used, metric.limit);
          const isUnlimited = metric.limit === -1;
          const Icon = metric.icon;
          
          return (
            <Card key={metric.name} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon className="h-5 w-5 text-gray-500" />
                {percentage >= 90 && !isUnlimited && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{metric.name}</p>
                
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${getUsageColor(percentage)}`}>
                    {metric.unit === 'GB' 
                      ? metric.used.toFixed(1) 
                      : formatNumber(metric.used)}
                  </span>
                  {!isUnlimited && (
                    <>
                      <span className="text-sm text-gray-500">/</span>
                      <span className="text-sm text-gray-500">
                        {metric.unit === 'GB'
                          ? `${metric.limit} ${metric.unit}`
                          : `${formatNumber(metric.limit)} ${metric.unit}`}
                      </span>
                    </>
                  )}
                  {isUnlimited && (
                    <span className="text-sm text-gray-500">Unlimited</span>
                  )}
                </div>
                
                {!isUnlimited && (
                  <Progress 
                    value={percentage} 
                    className="h-2"
                  />
                )}
                
                {!isUnlimited && (
                  <p className="text-xs text-gray-500">
                    {(100 - percentage).toFixed(0)}% remaining
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Usage Alerts */}
      {usage.apiCallsToday >= usage.apiCallsLimit * 0.9 && (
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-900">
                Approaching API call limit
              </p>
              <p className="text-sm text-yellow-700">
                You've used {Math.round((usage.apiCallsToday / usage.apiCallsLimit) * 100)}% of your daily API calls. 
                Consider upgrading your plan for more capacity.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// Usage Chart Component
export function UsageChart({ 
  data, 
  title 
}: { 
  data: Array<{ date: string; value: number }>; 
  title: string;
}) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-20">{item.date}</span>
            <div className="flex-1">
              <div className="h-6 bg-gray-100 rounded-md overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-md transition-all duration-500"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-semibold w-16 text-right">
              {formatNumber(item.value)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}