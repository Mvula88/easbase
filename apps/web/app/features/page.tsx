'use client';

import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Sparkles, 
  Database, 
  Zap, 
  Shield, 
  Code, 
  Globe,
  Layers,
  Lock,
  Rocket,
  Users,
  BarChart3,
  GitBranch,
  Terminal,
  Cloud,
  Cpu,
  Package,
  Settings,
  ArrowRight,
  Check
} from 'lucide-react';

export default function FeaturesPage() {
  const features = [
    {
      icon: Sparkles,
      title: 'Intelligent Schema Generation',
      description: 'Describe your application in plain English and get production-ready PostgreSQL schemas with best practices built-in.',
      highlights: [
        'Natural language to SQL conversion',
        'Optimized indexes and relationships',
        'Row Level Security policies',
        'Migration management'
      ]
    },
    {
      icon: Zap,
      title: 'Intelligent Caching System',
      description: 'Save up to 95% on generation costs with our vector-based similarity search and smart response caching.',
      highlights: [
        'Vector embeddings for semantic matching',
        'Automatic cache invalidation',
        'Redis-powered performance',
        'Usage analytics dashboard'
      ]
    },
    {
      icon: Shield,
      title: 'Authentication Templates',
      description: 'Pre-built, secure authentication patterns for different application types.',
      highlights: [
        'SaaS multi-tenant auth',
        'Marketplace buyer/seller flows',
        'Social app authentication',
        'Enterprise SSO support'
      ]
    },
    {
      icon: Database,
      title: 'Direct Database Deployment',
      description: 'Deploy your schemas directly to database projects with one click.',
      highlights: [
        'Automatic migration generation',
        'Rollback support',
        'Environment management',
        'Schema versioning'
      ]
    },
    {
      icon: Code,
      title: 'Developer Tools',
      description: 'Powerful SDK and CLI tools for seamless integration into your workflow.',
      highlights: [
        'TypeScript SDK',
        'Command-line interface',
        'REST API access',
        'Webhook integrations'
      ]
    },
    {
      icon: Globe,
      title: 'Multi-Region Support',
      description: 'Deploy your backend infrastructure across multiple regions for optimal performance.',
      highlights: [
        'Automatic region selection',
        'Cross-region replication',
        'CDN integration',
        'Global load balancing'
      ]
    }
  ];

  const comparisonData = [
    { feature: 'Setup Time', traditional: '2-3 weeks', easbase: '5 minutes' },
    { feature: 'SQL Knowledge Required', traditional: 'Expert', easbase: 'None' },
    { feature: 'Cost per Schema', traditional: '$500-2000', easbase: '$0.10' },
    { feature: 'Security Best Practices', traditional: 'Manual', easbase: 'Automatic' },
    { feature: 'Documentation', traditional: 'Manual', easbase: 'Auto-generated' },
    { feature: 'Testing', traditional: 'Manual', easbase: 'Built-in' }
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-cyan-50 to-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <Badge className="mb-4 bg-cyan-100 text-cyan-700 border-cyan-200">
              Platform Features
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Everything You Need to
              <span className="block bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
                Build Backends Faster
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Comprehensive tools and features designed to accelerate your backend development 
              from concept to production.
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
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Core Features</h2>
            <p className="text-xl text-gray-600">
              Powerful capabilities that set Easbase apart
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-cyan-200 transition">
                <CardHeader>
                  <feature.icon className="w-10 h-10 text-cyan-500 mb-2" />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Traditional vs Easbase</h2>
            <p className="text-xl text-gray-600">
              See how much time and money you can save
            </p>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 font-medium">Feature</th>
                    <th className="text-center p-4 font-medium">Traditional Approach</th>
                    <th className="text-center p-4 font-medium">
                      <span className="text-cyan-600">With Easbase</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-4 font-medium">{row.feature}</td>
                      <td className="p-4 text-center text-gray-500">{row.traditional}</td>
                      <td className="p-4 text-center">
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          {row.easbase}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Advanced Capabilities</h2>
            <p className="text-xl text-gray-600">
              Enterprise-grade features for scaling teams
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <GitBranch className="w-10 h-10 text-cyan-500 mb-2" />
                <CardTitle>Version Control Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Seamlessly integrate with your existing Git workflow. Track schema changes, 
                  review migrations, and collaborate with your team.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">GitHub & GitLab integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Pull request previews</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Automated testing</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="w-10 h-10 text-cyan-500 mb-2" />
                <CardTitle>Analytics & Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Get insights into your database performance, API usage, and cost optimization 
                  opportunities with built-in analytics.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Real-time metrics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Cost tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Performance insights</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-10 h-10 text-cyan-500 mb-2" />
                <CardTitle>Team Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Work together efficiently with role-based access control, shared environments, 
                  and collaborative schema design.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Role-based permissions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Shared workspaces</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Activity logs</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Terminal className="w-10 h-10 text-cyan-500 mb-2" />
                <CardTitle>CLI & Automation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Automate your workflow with our powerful CLI and integrate Easbase into your 
                  CI/CD pipeline for continuous deployment.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Command-line interface</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">CI/CD integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Automated deployments</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-cyan-500 to-teal-500">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Experience These Features?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Start building your backend infrastructure in minutes, not weeks
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="bg-white text-cyan-600 hover:bg-gray-100">
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="outline" className="border-2 border-white bg-white/10 text-white hover:bg-white/20">
                View Documentation
              </Button>
            </Link>
          </div>
          <p className="text-sm mt-4 opacity-80">
            No credit card required • 100 free API calls/month
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}