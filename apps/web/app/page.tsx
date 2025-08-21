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
            <Badge className="mb-4 bg-cyan-100 text-cyan-700 border-cyan-200">
              Powered by Claude AI
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Backend Infrastructure
              <span className="block bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
                at Ease
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Generate production-ready database schemas, deploy authentication templates, 
              and manage your backend infrastructure using natural language.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600">
                  Start Building Free
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
              No credit card required • 100 free API calls/month
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
                  <span className="text-gray-400">// Generate schema with AI</span><br/>
                  <span className="text-white">const schema = await easbase.</span>
                  <span className="text-yellow-400">generate</span>
                  <span className="text-white">(</span><br/>
                  <span className="text-green-400">  "E-commerce platform with products, orders, and reviews"</span><br/>
                  <span className="text-white">);</span>
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
              Everything You Need to Build
            </h2>
            <p className="text-xl text-gray-600">
              From schema generation to deployment, we've got you covered
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-cyan-200 transition">
              <CardHeader>
                <Sparkles className="w-10 h-10 text-cyan-500 mb-2" />
                <CardTitle>AI Schema Generation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Describe your app in plain English and get production-ready PostgreSQL schemas with RLS policies
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-cyan-200 transition">
              <CardHeader>
                <Zap className="w-10 h-10 text-cyan-500 mb-2" />
                <CardTitle>Smart Caching</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Save up to 95% on AI costs with vector-based similarity search and intelligent response caching
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-cyan-200 transition">
              <CardHeader>
                <Shield className="w-10 h-10 text-cyan-500 mb-2" />
                <CardTitle>Auth Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Pre-built authentication patterns for SaaS, marketplaces, and social apps ready to deploy
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-cyan-200 transition">
              <CardHeader>
                <Database className="w-10 h-10 text-cyan-500 mb-2" />
                <CardTitle>Direct Deployment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Deploy schemas directly to your Supabase projects with one click and automatic rollback support
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-cyan-200 transition">
              <CardHeader>
                <Code className="w-10 h-10 text-cyan-500 mb-2" />
                <CardTitle>SDK & CLI</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Integrate Easbase into your workflow with our TypeScript SDK and command-line tools
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-cyan-200 transition">
              <CardHeader>
                <Lock className="w-10 h-10 text-cyan-500 mb-2" />
                <CardTitle>Enterprise Security</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Your data stays in your infrastructure. We never store your database credentials
                </p>
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
              <div className="text-4xl font-bold text-cyan-500 mb-2">95%</div>
              <div className="text-gray-600">Cost Reduction</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-500 mb-2">10x</div>
              <div className="text-gray-600">Faster Development</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-500 mb-2">0ms</div>
              <div className="text-gray-600">Cache Latency</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-500 mb-2">100%</div>
              <div className="text-gray-600">PostgreSQL Compatible</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Three simple steps to production-ready infrastructure
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Describe Your App</h3>
              <p className="text-gray-600">
                Tell us what you're building in plain English. No SQL knowledge required.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Generates Schema</h3>
              <p className="text-gray-600">
                Claude AI creates optimized PostgreSQL schemas with security best practices.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Deploy Instantly</h3>
              <p className="text-gray-600">
                One-click deployment to your Supabase project with automatic rollback support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-cyan-500 to-teal-500">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Build Faster?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of developers building backends 10x faster with AI
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="bg-white text-cyan-600 hover:bg-gray-100">
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Talk to Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}