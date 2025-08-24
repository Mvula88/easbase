'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Database, 
  Mail, 
  Key, 
  FolderOpen, 
  Copy, 
  Check,
  AlertCircle,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  CreditCard,
  Activity,
  Package,
  Users,
  Clock,
  FileCode,
  Rocket,
  ChevronRight,
  Star,
  HelpCircle,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ArrowRight,
  BarChart3,
  Cpu,
  MessageSquare,
  Lock,
  Building2,
  HardDrive
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/auth/supabase-client';
import { PRICING_PLANS } from '@/lib/config/pricing';
import * as userService from '@/lib/services/user-client';
// User data will be passed as props from server component
import { format } from 'date-fns';

interface DashboardData {
  user: {
    id: string;
    email: string;
    name: string;
    company: string;
    avatar: string;
  };
  subscription: {
    plan: string;
    status: string;
    billingPeriod: string;
    currentPeriodEnd?: string;
    trialEnd?: string;
  };
  backends: {
    total: number;
    active: number;
    limit: number;
  };
  usage: {
    apiCallsToday: number;
    apiCallsLimit: number;
    databaseSize: number;
    databaseLimit: number;
  };
  projects: any[];
  recentDeployments: any[];
}

export default function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  // Subscribe to real-time profile updates
  useEffect(() => {
    const unsubscribe = userService.subscribeToProfileChanges(
      (profile: any) => {
        setData(prev => ({
          ...prev,
          subscription: {
            plan: profile.subscription_plan,
            status: profile.subscription_status,
            billingPeriod: profile.billing_period,
            currentPeriodEnd: profile.current_period_end,
            trialEnd: profile.trial_end,
          },
        }));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [data.user.id]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description",
        variant: "destructive"
      });
      return;
    }

    // Check usage limits
    const canGenerate = await userService.checkUsageLimits();
    if (!canGenerate) {
      toast({
        title: "Usage Limit Reached",
        description: "You've reached your generation limit. Please upgrade your plan.",
        variant: "destructive"
      });
      setShowUpgradeModal(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate schema');
      }

      const result = await response.json();
      
      // Track usage
      await userService.trackUsage('ai_generation');
      
      // Log activity
      await userService.logActivity('schema.generated', 'schema', result.id, { prompt });

      toast({
        title: "Success",
        description: "Schema generated successfully!"
      });

      // Refresh stats
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate schema",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear any local storage or state
      router.push('/');
      router.refresh();
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUpgrade = async (newPlan: string) => {
    try {
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          planKey: newPlan,
          billingPeriod: data.subscription.billingPeriod 
        }),
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create checkout session",
        variant: "destructive"
      });
    }
  };

  // Calculate monthly price based on plan
  const monthlyPrice = data.subscription.plan === 'free' ? 0 :
    PRICING_PLANS[data.subscription.plan as keyof typeof PRICING_PLANS]?.price || 0;

  // Format dates
  const nextBillingDate = data.subscription.currentPeriodEnd 
    ? format(new Date(data.subscription.currentPeriodEnd), 'MMM d, yyyy')
    : 'N/A';

  const isTrialing = data.subscription.status === 'trialing';
  const trialDaysLeft = data.subscription.trialEnd
    ? Math.max(0, Math.ceil((new Date(data.subscription.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b">
            <Link href="/" className="flex items-center">
              <img src="/easbase-logo.png" alt="Easbase" className="h-10 w-auto" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full justify-start text-left font-medium">
                <BarChart3 className="w-4 h-4 mr-3" />
                Overview
              </Button>
            </Link>
            <Link href="/dashboard/create-project">
              <Button variant="ghost" className="w-full justify-start text-left">
                <Rocket className="w-4 h-4 mr-3" />
                Create Backend
              </Button>
            </Link>
            <Link href="/dashboard/projects">
              <Button variant="ghost" className="w-full justify-start text-left">
                <Database className="w-4 h-4 mr-3" />
                My Backends
              </Button>
            </Link>
            <Link href="/dashboard/api-usage">
              <Button variant="ghost" className="w-full justify-start text-left">
                <Activity className="w-4 h-4 mr-3" />
                API Usage
              </Button>
            </Link>
            <Link href="/dashboard/billing">
              <Button variant="ghost" className="w-full justify-start text-left">
                <CreditCard className="w-4 h-4 mr-3" />
                Billing
              </Button>
            </Link>
            <Link href="/dashboard/settings">
              <Button variant="ghost" className="w-full justify-start text-left">
                <Settings className="w-4 h-4 mr-3" />
                Settings
              </Button>
            </Link>
          </nav>

          {/* User section */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 flex items-center justify-center text-white text-sm font-medium">
                  {data.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{data.user.name}</p>
                  <p className="text-xs text-gray-500">{data.user.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold">Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <HelpCircle className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="p-6">
          {/* Create Backend CTA */}
          <Card className="mb-6 border-2 border-cyan-200 bg-gradient-to-r from-cyan-50 to-teal-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">Create Your Backend in 60 Seconds</h3>
                  <p className="text-gray-600">Choose a template, configure features, and get instant API access</p>
                </div>
                <Link href="/dashboard/create-project">
                  <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600">
                    <Rocket className="w-5 h-5 mr-2" />
                    Create Backend
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Trial/Subscription Banner */}
          {isTrialing && (
            <Alert className="mb-6 border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Your free trial ends in {trialDaysLeft} days. 
                <Button 
                  variant="link" 
                  className="text-yellow-900 underline p-0 h-auto ml-1"
                  onClick={() => setShowUpgradeModal(true)}
                >
                  Upgrade now
                </Button> to keep using all features.
              </AlertDescription>
            </Alert>
          )}

          {/* Subscription Card */}
          <Card className="mb-6 bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold capitalize">{data.subscription.plan} Plan</h2>
                    <Badge className="bg-white/20 text-white border-white/30">
                      {data.subscription.billingPeriod === 'annual' ? 'Annual' : 'Monthly'}
                    </Badge>
                  </div>
                  <p className="text-white/90">
                    {data.subscription.plan === 'free' 
                      ? 'Free forever • Upgrade to unlock more features'
                      : `$${monthlyPrice}/month • Next billing: ${nextBillingDate}`
                    }
                  </p>
                  <div className="flex gap-4 mt-4">
                    <div>
                      <p className="text-white/70 text-sm">Active Backends</p>
                      <p className="text-xl font-semibold">
                        {data.backends.active}/{data.backends.limit === -1 ? '∞' : data.backends.limit}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">API Calls Today</p>
                      <p className="text-xl font-semibold">
                        {data.usage.apiCallsToday.toLocaleString()}/{data.usage.apiCallsLimit.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Database Size</p>
                      <p className="text-xl font-semibold">
                        {data.usage.databaseSize.toFixed(1)}GB/{data.usage.databaseLimit}GB
                      </p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Total Backends</p>
                      <p className="text-xl font-semibold">
                        {data.backends.total}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {data.subscription.plan !== 'scale' && (
                    <Button 
                      className="bg-white text-gray-900 hover:bg-gray-100 font-semibold shadow-lg"
                      onClick={() => setShowUpgradeModal(true)}
                    >
                      <ArrowUpRight className="w-4 h-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  )}
                  <Button 
                    style={{ backgroundColor: 'white', color: '#0891b2' }}
                    className="hover:opacity-90 font-semibold shadow-lg"
                    onClick={() => router.push('/dashboard/billing')}
                  >
                    <CreditCard className="w-4 h-4 mr-2" style={{ color: '#0891b2' }} />
                    <span style={{ color: '#0891b2' }}>Manage Billing</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Backend-as-a-Service Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="hover:shadow-lg transition">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                  Active Backends
                  <Database className="w-4 h-4 text-cyan-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{data.backends.active}</span>
                  <span className="text-sm text-gray-500">/ {data.backends.limit}</span>
                </div>
                <Progress value={(data.backends.active / data.backends.limit) * 100} className="mt-2 h-1" />
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                  API Calls Today
                  <Activity className="w-4 h-4 text-purple-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{data.usage.apiCallsToday.toLocaleString()}</span>
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    <TrendingUp className="w-3 h-3 mr-1 inline" />
                    12%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                  Database Size
                  <HardDrive className="w-4 h-4 text-green-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{data.usage.databaseSize.toFixed(1)}</span>
                  <span className="text-sm text-gray-500">GB used</span>
                </div>
                <Progress value={(data.usage.databaseSize / data.usage.databaseLimit) * 100} className="mt-2 h-1" />
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                  Uptime
                  <Clock className="w-4 h-4 text-orange-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">99.9</span>
                  <span className="text-sm text-gray-500">%</span>
                </div>
                <Badge className="bg-green-100 text-green-700 text-xs mt-2">
                  All Systems Operational
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Quick Start Guide */}
          <Card className="mb-6 bg-gradient-to-br from-cyan-50 to-teal-50 border-cyan-200">
            <CardHeader>
              <CardTitle>Your Backend-as-a-Service Platform</CardTitle>
              <CardDescription>
                Create complete backends in 60 seconds without writing code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-cyan-500" />
                    Complete Authentication
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Email/Password & OAuth</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Magic Links & 2FA</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Session Management</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Users className="w-4 h-4 mr-2 text-purple-500" />
                    Team Management
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Organizations & Teams</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Role-based Permissions</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Invitation System</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3 flex items-center">
                    <CreditCard className="w-4 h-4 mr-2 text-green-500" />
                    Stripe Billing
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Subscriptions & Usage Billing</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Customer Portal</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Webhook Processing</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-orange-500" />
                    Communications
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Transactional Emails</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />SMS & OTP Verification</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Email Templates</li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 p-4 bg-white rounded-lg border border-cyan-200">
                <p className="text-sm font-medium mb-2">Get started with one command:</p>
                <div className="flex items-center justify-between bg-gray-900 text-white p-3 rounded">
                  <code className="text-cyan-400">npx create-easbase-app my-app</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText('npx create-easbase-app my-app');
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-white hover:bg-gray-800"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Deployments */}
          {data.recentDeployments && data.recentDeployments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Deployments</CardTitle>
                <CardDescription>Latest changes to your backends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.recentDeployments.map((deployment: any) => (
                    <div key={deployment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <Rocket className="w-4 h-4 text-cyan-500" />
                        <div>
                          <p className="text-sm font-medium">
                            {deployment.customer_projects?.project_name || 'Backend'} - {deployment.deployment_type}
                          </p>
                          <p className="text-xs text-gray-500">
                            {deployment.created_at ? format(new Date(deployment.created_at), 'MMM d, h:mm a') : 'Recently'}
                          </p>
                        </div>
                      </div>
                      <Badge className={deployment.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                        {deployment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Your Backends */}
          {data.projects && data.projects.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Backends</CardTitle>
                    <CardDescription>Manage your backend projects</CardDescription>
                  </div>
                  <Link href="/dashboard/projects">
                    <Button variant="outline" size="sm">
                      View All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.projects.slice(0, 3).map((project: any) => (
                    <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${project.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        <div>
                          <p className="font-medium">{project.project_name}</p>
                          <p className="text-sm text-gray-500">{project.business_type}</p>
                        </div>
                      </div>
                      <Link href={`/dashboard/projects/${project.id}`}>
                        <Button variant="ghost" size="sm">
                          Manage
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}