'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Download, 
  Calendar,
  AlertCircle,
  CheckCircle,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Clock,
  Receipt,
  Shield
} from 'lucide-react';
import { createClient } from '@/lib/auth/supabase-client';
import { PRICING_PLANS } from '@/lib/config/pricing';
import { format } from 'date-fns';

interface BillingData {
  user: {
    id: string;
    email: string;
    name: string;
  };
  subscription: {
    plan: string;
    status: string;
    billingPeriod: string;
    currentPeriodEnd?: string;
    currentPeriodStart?: string;
    trialEnd?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };
  usage: {
    currentPeriodUsage: number;
    limit: number;
  };
  paymentMethods: Array<{
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    isDefault: boolean;
  }>;
  invoices: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    date: string;
    downloadUrl?: string;
  }>;
}

export default function BillingPage() {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/login');
        return;
      }
      
      await fetchBillingData();
    }

    checkAuth();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      
      // Get user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) {
        router.push('/onboarding');
        return;
      }

      // Mock billing data - replace with actual Stripe API calls
      const mockBillingData: BillingData = {
        user: {
          id: user.id,
          email: user.email || '',
          name: profile.full_name || ''
        },
        subscription: {
          plan: profile.subscription_plan || 'starter',
          status: profile.subscription_status || 'active',
          billingPeriod: profile.billing_period || 'monthly',
          currentPeriodEnd: profile.current_period_end,
          currentPeriodStart: profile.current_period_start,
          trialEnd: profile.trial_end,
          stripeCustomerId: profile.stripe_customer_id,
          stripeSubscriptionId: profile.stripe_subscription_id
        },
        usage: {
          currentPeriodUsage: 45,
          limit: 100
        },
        paymentMethods: [
          {
            id: 'pm_1234',
            brand: 'visa',
            last4: '4242',
            expMonth: 12,
            expYear: 2025,
            isDefault: true
          }
        ],
        invoices: [
          {
            id: 'in_1234',
            amount: 14900,
            currency: 'usd',
            status: 'paid',
            date: '2024-01-01T00:00:00Z',
            downloadUrl: '#'
          },
          {
            id: 'in_5678',
            amount: 14900,
            currency: 'usd',
            status: 'paid',
            date: '2023-12-01T00:00:00Z',
            downloadUrl: '#'
          }
        ]
      };

      setBillingData(mockBillingData);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (newPlan: string) => {
    if (!billingData) return;
    
    try {
      setUpgrading(true);
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          planKey: newPlan,
          billingPeriod: billingData.subscription.billingPeriod 
        }),
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!billingData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Billing Data</h1>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const currentPlan = PRICING_PLANS[billingData.subscription.plan as keyof typeof PRICING_PLANS];
  const isTrialing = billingData.subscription.status === 'trialing';
  const trialDaysLeft = billingData.subscription.trialEnd
    ? Math.max(0, Math.ceil((new Date(billingData.subscription.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
          <p className="text-gray-600">Manage your subscription, payment methods, and billing history</p>
        </div>

        {/* Trial Alert */}
        {isTrialing && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Your free trial ends in {trialDaysLeft} days. 
              <Button 
                variant="link" 
                className="text-yellow-900 underline p-0 h-auto ml-1"
                onClick={() => handleUpgrade('professional')}
              >
                Upgrade now
              </Button> to keep using all features.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Subscription */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Subscription</span>
              <Badge variant={billingData.subscription.status === 'active' ? 'default' : 'secondary'}>
                {billingData.subscription.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold capitalize">{currentPlan?.name} Plan</h3>
                    <p className="text-gray-600">
                      ${currentPlan?.price}/month • {billingData.subscription.billingPeriod}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  {billingData.subscription.currentPeriodStart && (
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      Current period: {format(new Date(billingData.subscription.currentPeriodStart), 'MMM d')} - 
                      {billingData.subscription.currentPeriodEnd && format(new Date(billingData.subscription.currentPeriodEnd), 'MMM d, yyyy')}
                    </div>
                  )}
                  {billingData.subscription.currentPeriodEnd && (
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      Next billing date: {format(new Date(billingData.subscription.currentPeriodEnd), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span>Usage this period</span>
                    <span>{billingData.usage.currentPeriodUsage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-cyan-500 h-2 rounded-full" 
                      style={{ width: `${billingData.usage.currentPeriodUsage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {billingData.subscription.plan !== 'business' && (
                    <Button 
                      onClick={() => handleUpgrade('professional')} 
                      className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white"
                      disabled={upgrading}
                    >
                      <ArrowUpRight className="w-4 h-4 mr-2" />
                      {upgrading ? 'Processing...' : 'Upgrade Plan'}
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    onClick={handleManageSubscription}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Subscription
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Manage your payment methods and billing information</CardDescription>
          </CardHeader>
          <CardContent>
            {billingData.paymentMethods.length > 0 ? (
              <div className="space-y-3">
                {billingData.paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-6 bg-gray-900 text-white rounded text-xs flex items-center justify-center">
                        {method.brand.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">•••• •••• •••• {method.last4}</p>
                        <p className="text-sm text-gray-600">
                          Expires {String(method.expMonth).padStart(2, '0')}/{method.expYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {method.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No payment methods added</p>
                <Button className="mt-3" onClick={handleManageSubscription}>
                  Add Payment Method
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>Download your invoices and view payment history</CardDescription>
          </CardHeader>
          <CardContent>
            {billingData.invoices.length > 0 ? (
              <div className="space-y-3">
                {billingData.invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Receipt className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          ${(invoice.amount / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(invoice.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={invoice.status === 'paid' ? 'default' : 'secondary'}
                        className={invoice.status === 'paid' ? 'bg-green-100 text-green-700' : ''}
                      >
                        {invoice.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {invoice.status}
                      </Badge>
                      {invoice.downloadUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={invoice.downloadUrl} download>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No invoices yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}