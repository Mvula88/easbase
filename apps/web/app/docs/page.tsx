'use client';

import { useState } from 'react';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { 
  Search,
  Book,
  Code,
  Terminal,
  Zap,
  Database,
  Shield,
  Settings,
  Package,
  GitBranch,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  FileText,
  PlayCircle,
  Download,
  Copy,
  Check,
  ExternalLink,
  Rocket,
  Layers,
  Cloud,
  Key,
  Globe,
  Users
} from 'lucide-react';

const docsSections = [
  {
    title: 'Getting Started',
    icon: Rocket,
    expanded: true,
    items: [
      { title: 'Introduction', href: '#introduction' },
      { title: 'Quick Start', href: '#quick-start' },
      { title: 'Installation', href: '#installation' },
      { title: 'Authentication', href: '#authentication' },
      { title: 'Your First Schema', href: '#first-schema' }
    ]
  },
  {
    title: 'Core Concepts',
    icon: Book,
    items: [
      { title: 'How It Works', href: '#how-it-works' },
      { title: 'Schema Generation', href: '#schema-generation' },
      { title: 'Caching System', href: '#caching' },
      { title: 'Security Model', href: '#security' },
      { title: 'Pricing & Limits', href: '#pricing-limits' }
    ]
  },
  {
    title: 'Schema Generation',
    icon: Database,
    items: [
      { title: 'Natural Language Prompts', href: '#prompts' },
      { title: 'Schema Optimization', href: '#optimization' },
      { title: 'Relationships & Indexes', href: '#relationships' },
      { title: 'Row Level Security', href: '#rls' },
      { title: 'Migrations', href: '#migrations' }
    ]
  },
  {
    title: 'Authentication Templates',
    icon: Shield,
    items: [
      { title: 'Template Overview', href: '#auth-overview' },
      { title: 'SaaS Multi-Tenant', href: '#saas-auth' },
      { title: 'Marketplace', href: '#marketplace-auth' },
      { title: 'Social Apps', href: '#social-auth' },
      { title: 'Custom Auth Patterns', href: '#custom-auth' }
    ]
  },
  {
    title: 'API Reference',
    icon: Code,
    items: [
      { title: 'REST API', href: '#rest-api' },
      { title: 'Authentication', href: '#api-auth' },
      { title: 'Endpoints', href: '#endpoints' },
      { title: 'Rate Limiting', href: '#rate-limiting' },
      { title: 'Error Handling', href: '#errors' }
    ]
  },
  {
    title: 'SDK & CLI',
    icon: Terminal,
    items: [
      { title: 'TypeScript SDK', href: '#typescript-sdk' },
      { title: 'CLI Installation', href: '#cli-install' },
      { title: 'CLI Commands', href: '#cli-commands' },
      { title: 'Configuration', href: '#config' },
      { title: 'Examples', href: '#examples' }
    ]
  },
  {
    title: 'Deployment',
    icon: Cloud,
    items: [
      { title: 'Database Integration', href: '#database' },
      { title: 'Direct Deployment', href: '#direct-deploy' },
      { title: 'Environment Variables', href: '#env-vars' },
      { title: 'CI/CD Integration', href: '#cicd' },
      { title: 'Rollbacks', href: '#rollbacks' }
    ]
  },
  {
    title: 'Advanced',
    icon: Settings,
    items: [
      { title: 'Custom Functions', href: '#functions' },
      { title: 'Webhooks', href: '#webhooks' },
      { title: 'Team Collaboration', href: '#teams' },
      { title: 'Enterprise Features', href: '#enterprise' },
      { title: 'Best Practices', href: '#best-practices' }
    ]
  }
];

const codeExamples = {
  quickStart: `// Install the Easbase SDK
npm install @easbase/sdk

// Initialize the client
import { Easbase } from '@easbase/sdk';

const easbase = new Easbase({
  apiKey: process.env.EASBASE_API_KEY
});

// Generate a schema
const schema = await easbase.generate({
  prompt: "E-commerce platform with products, orders, and customers"
});

// Deploy to Database
await easbase.deploy(schema, {
  projectUrl: process.env.DATABASE_URL,
  serviceKey: process.env.DATABASE_SERVICE_KEY
});`,

  cliExample: `# Install the CLI globally
npm install -g @easbase/cli

# Login to your account
easbase login

# Generate a schema
easbase generate "Social media app with posts and comments"

# Deploy to your project
easbase deploy --project my-project

# View your schemas
easbase list schemas`,

  apiExample: `curl -X POST https://api.easbase.dev/v1/generate \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Task management app with projects and tasks",
    "options": {
      "includeRLS": true,
      "includeIndexes": true
    }
  }'`
};

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Getting Started']));
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedSections(newExpanded);
  };

  const copyCode = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-12 px-6 bg-gradient-to-b from-cyan-50 to-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <Badge className="mb-4 bg-cyan-100 text-cyan-700 border-cyan-200">
              Documentation
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Easbase
              <span className="block bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
                Documentation
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Everything you need to know to build backend infrastructure instantly
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 text-lg rounded-xl shadow-md"
              />
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              <Link href="#quick-start">
                <Button variant="outline" size="sm">
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Quick Start
                </Button>
              </Link>
              <Link href="#api-reference">
                <Button variant="outline" size="sm">
                  <Code className="w-4 h-4 mr-2" />
                  API Reference
                </Button>
              </Link>
              <Link href="#examples">
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Examples
                </Button>
              </Link>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download SDK
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Documentation */}
      <section className="py-12 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-[280px_1fr] gap-8">
            {/* Sidebar Navigation */}
            <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:overflow-y-auto">
              <nav className="space-y-2">
                {docsSections.map((section) => (
                  <div key={section.title}>
                    <button
                      onClick={() => toggleSection(section.title)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-100 rounded-lg transition"
                    >
                      <div className="flex items-center gap-2">
                        <section.icon className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{section.title}</span>
                      </div>
                      {expandedSections.has(section.title) ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {expandedSections.has(section.title) && (
                      <div className="ml-6 mt-1 space-y-1">
                        {section.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="block px-3 py-1.5 text-sm text-gray-600 hover:text-cyan-600 hover:bg-gray-50 rounded"
                          >
                            {item.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </aside>

            {/* Main Content */}
            <main className="min-w-0">
              {/* Introduction */}
              <div id="introduction" className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Introduction</h2>
                <p className="text-gray-600 mb-6">
                  Easbase is an advanced platform that revolutionizes backend development by generating 
                  production-ready database schemas, authentication templates, and infrastructure code using 
                  natural language descriptions.
                </p>
                <Card>
                  <CardHeader>
                    <CardTitle>Key Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 mt-0.5" />
                        <span>Generate PostgreSQL schemas from plain English descriptions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 mt-0.5" />
                        <span>Deploy directly to your database with one click</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 mt-0.5" />
                        <span>Save 95% on generation costs with advanced caching</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 mt-0.5" />
                        <span>Pre-built authentication templates for common patterns</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 mt-0.5" />
                        <span>Automatic Row Level Security policies</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Start */}
              <div id="quick-start" className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Quick Start</h2>
                <p className="text-gray-600 mb-6">
                  Get up and running with Easbase in less than 5 minutes.
                </p>
                
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>1. Install the SDK</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyCode(codeExamples.quickStart, 'quickStart')}
                        >
                          {copiedCode === 'quickStart' ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code>{codeExamples.quickStart}</code>
                      </pre>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>2. Using the CLI</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code>{codeExamples.cliExample}</code>
                      </pre>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>3. Direct API Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code>{codeExamples.apiExample}</code>
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* API Reference */}
              <div id="api-reference" className="mb-12">
                <h2 className="text-3xl font-bold mb-4">API Reference</h2>
                <p className="text-gray-600 mb-6">
                  Complete reference for all Easbase API endpoints.
                </p>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">POST /v1/generate</CardTitle>
                        <Badge>Core</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">
                        Generate a database schema from a natural language description.
                      </p>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Request Body</h4>
                          <div className="bg-gray-100 p-3 rounded">
                            <code className="text-sm">
                              {`{
  "prompt": "string",
  "options": {
    "includeRLS": boolean,
    "includeIndexes": boolean,
    "includeMigrations": boolean
  }
}`}
                            </code>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Response</h4>
                          <div className="bg-gray-100 p-3 rounded">
                            <code className="text-sm">
                              {`{
  "id": "string",
  "schema": "string",
  "tables": [...],
  "cached": boolean
}`}
                            </code>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">POST /v1/deploy</CardTitle>
                        <Badge>Core</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">
                        Deploy a schema to your database project.
                      </p>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Request Body</h4>
                          <div className="bg-gray-100 p-3 rounded">
                            <code className="text-sm">
                              {`{
  "schemaId": "string",
  "projectUrl": "string",
  "serviceKey": "string",
  "options": {
    "runMigrations": boolean,
    "backup": boolean
  }
}`}
                            </code>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">GET /v1/schemas</CardTitle>
                        <Badge variant="secondary">Management</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">
                        List all generated schemas for your account.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Best Practices */}
              <div id="best-practices" className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Best Practices</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <Zap className="w-8 h-8 text-cyan-500 mb-2" />
                      <CardTitle>Optimize Prompts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">
                        Be specific about relationships, constraints, and business rules 
                        to get the most accurate schema generation from our engine.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <Shield className="w-8 h-8 text-cyan-500 mb-2" />
                      <CardTitle>Security First</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">
                        Always enable Row Level Security and review generated policies 
                        before deploying to production.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <Database className="w-8 h-8 text-cyan-500 mb-2" />
                      <CardTitle>Version Control</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">
                        Export and commit your schemas to Git for version control and 
                        team collaboration.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <GitBranch className="w-8 h-8 text-cyan-500 mb-2" />
                      <CardTitle>Test First</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">
                        Deploy to development environments first and thoroughly test 
                        before production deployment.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Need Help? */}
              <Card className="bg-gradient-to-r from-cyan-500 to-teal-500 border-0 text-white">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-4">Need Help?</h3>
                  <p className="mb-6 opacity-90">
                    Can't find what you're looking for? Our support team is here to help.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link href="/help">
                      <Button className="bg-white text-cyan-600 hover:bg-gray-100">
                        Visit Help Center
                      </Button>
                    </Link>
                    <Link href="/contact">
                      <Button variant="outline" className="border-2 border-white bg-white/10 text-white hover:bg-white/20">
                        Contact Support
                      </Button>
                    </Link>
                    <Button variant="outline" className="border-2 border-white bg-white/10 text-white hover:bg-white/20">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Join Discord
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </main>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}