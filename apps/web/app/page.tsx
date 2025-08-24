'use client';

import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { 
  Zap, 
  Database, 
  Shield, 
  Sparkles,
  Code,
  ArrowRight,
  Check,
  Clock,
  DollarSign,
  Globe,
  Layers,
  Lock,
  Rocket,
  TrendingUp,
  Users
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-cyan-50 to-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <Badge className="mb-4 bg-green-100 text-green-700 border-green-200">
              🚀 Launch 50% Faster · Save $40,000+
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Your Backend is Done.
              <span className="block bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
                Ship Your App Today.
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto">
              Stop building auth, teams, billing, emails, and storage from scratch.
              Get everything working in <span className="font-bold text-gray-900">5 minutes</span>, not 5 months.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-8 text-sm">
              <Badge variant="outline">✅ Authentication & SSO</Badge>
              <Badge variant="outline">✅ Team Management</Badge>
              <Badge variant="outline">✅ Stripe Billing</Badge>
              <Badge variant="outline">✅ Email Service</Badge>
              <Badge variant="outline">✅ File Storage</Badge>
              <Badge variant="outline">✅ Admin Dashboard</Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600">
                  Start 14-Day Free Trial
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline">
                  View Pricing
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              No credit card required • 14-day free trial • Starting at $149/month
            </p>
          </div>

          {/* Demo Video/Screenshot */}
          <div className="mt-16 rounded-lg shadow-2xl overflow-hidden bg-gray-900 p-2">
            <div className="bg-gray-800 rounded-lg p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-gray-400 text-sm">easbase.dev</span>
              </div>
              <div className="bg-gray-900 rounded p-4">
                <code className="text-cyan-400">
                  <span className="text-gray-400">{`// One command to get everything`}</span><br/>
                  <span className="text-purple-400">npx</span>
                  <span className="text-white"> create-easbase-app my-app</span><br/><br/>
                  <span className="text-gray-400">{`// Everything just works`}</span><br/>
                  <span className="text-white">await easbase.auth.</span>
                  <span className="text-yellow-400">signUp</span>
                  <span className="text-white">(user);</span><br/>
                  <span className="text-white">await easbase.teams.</span>
                  <span className="text-yellow-400">create</span>
                  <span className="text-white">(org);</span><br/>
                  <span className="text-white">await easbase.billing.</span>
                  <span className="text-yellow-400">checkout</span>
                  <span className="text-white">();</span>
                </code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Everything Your App Needs, Pre-Built
            </h2>
            <p className="text-xl text-gray-600">
              Stop rebuilding the same features. Focus on what makes your app unique.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-cyan-200 transition">
              <CardHeader>
                <Shield className="w-10 h-10 text-cyan-500 mb-2" />
                <CardTitle>Complete Authentication</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-3">
                  Production-ready auth system with everything included:
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Email & Password</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />OAuth (Google, GitHub)</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Magic Links</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />2FA/MFA Support</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-cyan-200 transition">
              <CardHeader>
                <Users className="w-10 h-10 text-cyan-500 mb-2" />
                <CardTitle>Team Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-3">
                  Multi-tenant architecture with organizations:
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Organizations & Teams</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Role-based Access</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Invitations System</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Permissions</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-cyan-200 transition">
              <CardHeader>
                <DollarSign className="w-10 h-10 text-cyan-500 mb-2" />
                <CardTitle>Stripe Billing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-3">
                  Complete billing system integrated:
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Subscriptions</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Usage-based Billing</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Customer Portal</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Webhooks</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-cyan-200 transition">
              <CardHeader>
                <Zap className="w-10 h-10 text-cyan-500 mb-2" />
                <CardTitle>Email & SMS</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-3">
                  Communications ready to go:
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Transactional Emails</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Email Templates</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />SMS/OTP</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Bulk Sending</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-cyan-200 transition">
              <CardHeader>
                <Database className="w-10 h-10 text-cyan-500 mb-2" />
                <CardTitle>File Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-3">
                  Secure file handling built-in:
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Direct Uploads</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />CDN Delivery</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Image Processing</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Signed URLs</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-cyan-200 transition">
              <CardHeader>
                <Layers className="w-10 h-10 text-cyan-500 mb-2" />
                <CardTitle>Admin Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-3">
                  Pre-built admin panel included:
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />User Management</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Analytics</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Billing Overview</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Activity Logs</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-cyan-500 mb-2">5min</div>
              <div className="text-gray-600">To Production</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-500 mb-2">$40k+</div>
              <div className="text-gray-600">Development Saved</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-500 mb-2">1 API</div>
              <div className="text-gray-600">For Everything</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-500 mb-2">24/7</div>
              <div className="text-gray-600">Support Included</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Start Building in 3 Steps
            </h2>
            <p className="text-xl text-gray-600">
              From zero to production-ready backend in minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Run One Command</h3>
              <p className="text-gray-600">
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">npx create-easbase-app</code>
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Everything Configured</h3>
              <p className="text-gray-600">
                Auth, teams, billing, emails, storage - all set up and ready to use.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Ship Your App</h3>
              <p className="text-gray-600">
                Focus on your unique features. The backend infrastructure is done.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-cyan-500 to-teal-500">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Stop Building. Start Shipping.
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Get your complete backend in 5 minutes. Save $40,000 in development costs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-cyan-600 hover:bg-gray-100">
                Start Free Trial
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button 
                size="lg" 
                style={{ backgroundColor: 'white', color: '#0891b2' }}
                className="hover:opacity-90 font-semibold"
              >
                <Users className="w-5 h-5 mr-2" style={{ color: '#0891b2' }} />
                <span style={{ color: '#0891b2' }}>Talk to Sales</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}