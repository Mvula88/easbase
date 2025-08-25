'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Code,
  Zap,
  Shield,
  Globe,
  Star,
  Download,
  TrendingUp,
  Search,
  Filter,
  ExternalLink,
  Copy,
  Check,
  DollarSign,
  Users,
  Clock,
  Package,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface APIProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number | 'free';
  pricing_model: 'one-time' | 'monthly' | 'per-request' | 'free';
  author: string;
  rating: number;
  downloads: number;
  endpoints: number;
  latency: string;
  uptime: string;
  features: string[];
  tags: string[];
  documentation_url: string;
  test_endpoint: string;
}

const API_PRODUCTS: APIProduct[] = [
  {
    id: 'payment-gateway',
    name: 'Universal Payment Gateway',
    description: 'Process payments with Stripe, PayPal, Square in one API',
    category: 'Payments',
    price: 49,
    pricing_model: 'monthly',
    author: 'PaymentPro',
    rating: 4.9,
    downloads: 3420,
    endpoints: 12,
    latency: '45ms',
    uptime: '99.99%',
    features: [
      'Multi-provider support',
      'Automatic failover',
      'PCI compliant',
      'Webhook management',
      'Fraud detection',
    ],
    tags: ['payments', 'stripe', 'paypal', 'fintech'],
    documentation_url: '/docs/payment-gateway',
    test_endpoint: 'https://api.easbase.io/payment-gateway/test',
  },
  {
    id: 'email-service',
    name: 'Smart Email API',
    description: 'Send transactional & marketing emails with AI personalization',
    category: 'Communication',
    price: 0.001,
    pricing_model: 'per-request',
    author: 'MailMaster',
    rating: 4.7,
    downloads: 2150,
    endpoints: 8,
    latency: '120ms',
    uptime: '99.95%',
    features: [
      'AI personalization',
      'Template engine',
      'Analytics tracking',
      'Spam score check',
      'Multi-provider routing',
    ],
    tags: ['email', 'sendgrid', 'marketing', 'transactional'],
    documentation_url: '/docs/email-service',
    test_endpoint: 'https://api.easbase.io/email-service/test',
  },
  {
    id: 'ai-content',
    name: 'AI Content Generator',
    description: 'Generate blog posts, product descriptions, and social media content',
    category: 'AI/ML',
    price: 99,
    pricing_model: 'monthly',
    author: 'AI Labs',
    rating: 4.8,
    downloads: 5670,
    endpoints: 15,
    latency: '800ms',
    uptime: '99.9%',
    features: [
      'GPT-4 powered',
      'SEO optimization',
      '50+ languages',
      'Tone customization',
      'Plagiarism check',
    ],
    tags: ['ai', 'content', 'gpt', 'seo', 'marketing'],
    documentation_url: '/docs/ai-content',
    test_endpoint: 'https://api.easbase.io/ai-content/test',
  },
  {
    id: 'geo-location',
    name: 'GeoLocation & Maps API',
    description: 'Geocoding, reverse geocoding, distance calculations, and routing',
    category: 'Location',
    price: 'free',
    pricing_model: 'free',
    author: 'MapTech',
    rating: 4.6,
    downloads: 8900,
    endpoints: 10,
    latency: '65ms',
    uptime: '99.97%',
    features: [
      'Global coverage',
      'Address validation',
      'Route optimization',
      'POI search',
      'Timezone data',
    ],
    tags: ['maps', 'geocoding', 'location', 'routing'],
    documentation_url: '/docs/geo-location',
    test_endpoint: 'https://api.easbase.io/geo-location/test',
  },
  {
    id: 'auth-service',
    name: 'Auth0 Alternative API',
    description: 'Complete authentication & authorization service with SSO',
    category: 'Security',
    price: 79,
    pricing_model: 'monthly',
    author: 'SecureAuth',
    rating: 4.9,
    downloads: 4230,
    endpoints: 20,
    latency: '35ms',
    uptime: '99.99%',
    features: [
      'OAuth 2.0 / OIDC',
      'SAML support',
      'MFA/2FA',
      'Social logins',
      'RBAC',
      'JWT management',
    ],
    tags: ['auth', 'security', 'oauth', 'jwt', 'sso'],
    documentation_url: '/docs/auth-service',
    test_endpoint: 'https://api.easbase.io/auth-service/test',
  },
];

export default function APIMarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const categories = ['all', 'Payments', 'AI/ML', 'Communication', 'Security', 'Location', 'Analytics'];

  const filteredAPIs = API_PRODUCTS.filter(api => {
    const matchesSearch = 
      api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || api.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const copyEndpoint = (endpoint: string, id: string) => {
    navigator.clipboard.writeText(endpoint);
    setCopiedEndpoint(id);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const testAPI = async (endpoint: string) => {
    window.open(endpoint, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            API Marketplace
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Ready-to-use APIs for every use case. Integrate in seconds.
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="text-3xl font-bold text-purple-600">50+</div>
              <div className="text-sm text-gray-500">APIs Available</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="text-3xl font-bold text-blue-600">10M+</div>
              <div className="text-sm text-gray-500">API Calls/Day</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="text-3xl font-bold text-green-600">99.9%</div>
              <div className="text-sm text-gray-500">Uptime SLA</div>
            </div>
          </div>

          {/* Search */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search for payment, email, AI, authentication APIs..."
                className="pl-10 pr-4 py-6 text-lg shadow-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className="whitespace-nowrap"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* API List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAPIs.map(api => (
            <Card key={api.id} className="hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{api.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">by {api.author}</p>
                  </div>
                  <div className="text-right">
                    {api.price === 'free' ? (
                      <Badge className="bg-green-500">FREE</Badge>
                    ) : (
                      <div>
                        <span className="text-2xl font-bold">${api.price}</span>
                        <span className="text-sm text-gray-500">/{api.pricing_model === 'monthly' ? 'mo' : api.pricing_model}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {api.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                    <div className="text-sm font-semibold">{api.endpoints}</div>
                    <div className="text-xs text-gray-500">Endpoints</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                    <div className="text-sm font-semibold">{api.latency}</div>
                    <div className="text-xs text-gray-500">Latency</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                    <div className="text-sm font-semibold">{api.uptime}</div>
                    <div className="text-xs text-gray-500">Uptime</div>
                  </div>
                </div>

                {/* Features */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {api.features.slice(0, 3).map((feature, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {api.features.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{api.features.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Ratings & Downloads */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
                    {api.rating} ({api.downloads} uses)
                  </div>
                  <Badge variant="outline">
                    {api.category}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    className="flex-1"
                    onClick={() => window.location.href = `/api-marketplace/${api.id}`}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Get API Key
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyEndpoint(api.test_endpoint, api.id)}
                  >
                    {copiedEndpoint === api.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => testAPI(api.test_endpoint)}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Become API Provider */}
        <Card className="mt-12 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">💰 Monetize Your APIs</h2>
                <p className="text-lg mb-4">
                  Turn your APIs into revenue. Earn 80% on every API call.
                </p>
                <div className="flex gap-4 mb-4">
                  <div>
                    <div className="text-2xl font-bold">$50K+</div>
                    <div className="text-sm">Avg Annual Earnings</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">80%</div>
                    <div className="text-sm">Revenue Share</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">24hr</div>
                    <div className="text-sm">Approval Time</div>
                  </div>
                </div>
                <Button size="lg" variant="secondary">
                  Publish Your API
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
              <div className="text-6xl">🚀</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}