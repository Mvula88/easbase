'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MARKETPLACE_TEMPLATES } from '@/lib/marketplace/templates';
import { 
  ShoppingCart,
  Star,
  Download,
  Search,
  Filter,
  TrendingUp,
  Zap,
  Eye,
  Code,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const categories = ['all', 'Transportation', 'Marketplace', 'SaaS', 'E-commerce', 'Social'];

  const filteredTemplates = MARKETPLACE_TEMPLATES.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handlePurchase = async (template: any) => {
    // This will trigger Stripe checkout
    const response = await fetch('/api/marketplace/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: template.id, price: template.price })
    });
    
    const { checkoutUrl } = await response.json();
    window.location.href = checkoutUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Backend Templates Marketplace
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Production-ready backends. Deploy in 1 click. Start earning in minutes.
          </p>

          {/* Marketplace Stats */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="text-3xl font-bold text-blue-600">2,341</div>
              <div className="text-sm text-gray-500">Templates Sold</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="text-3xl font-bold text-green-600">$185K</div>
              <div className="text-sm text-gray-500">Developer Earnings</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="text-3xl font-bold text-purple-600">4.9/5</div>
              <div className="text-sm text-gray-500">Average Rating</div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search for Uber clone, SaaS starter, E-commerce..."
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
                {category === 'all' && <Sparkles className="w-4 h-4 mr-2" />}
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Featured Banner */}
        <Card className="mb-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">🚀 Become a Template Creator</h2>
                <p className="text-lg mb-4">Earn 70% revenue share on every sale</p>
                <Button size="lg" variant="secondary">
                  Start Selling Templates
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
              <div className="text-6xl">💰</div>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <Card 
              key={template.id} 
              className="hover:shadow-2xl transition-all duration-300 overflow-hidden group"
            >
              {/* Template Image */}
              <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-6xl">
                    {template.category === 'Transportation' && '🚗'}
                    {template.category === 'Marketplace' && '🏠'}
                    {template.category === 'SaaS' && '💼'}
                    {template.category === 'E-commerce' && '🛍️'}
                    {template.category === 'Social' && '💬'}
                  </div>
                </div>
                {/* Price Badge */}
                <div className="absolute top-4 right-4">
                  <Badge className="bg-white text-black px-3 py-1 text-lg font-bold">
                    ${template.price}
                  </Badge>
                </div>
                {/* Popular Badge */}
                {template.downloads > 1000 && (
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-yellow-500 text-black">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Popular
                    </Badge>
                  </div>
                )}
              </div>

              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      by {template.author}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="ml-1 text-sm font-semibold">{template.rating}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {template.description}
                </p>

                {/* Features Preview */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {template.features.slice(0, 3).map((feature, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {template.features.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.features.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Download className="w-4 h-4 mr-1" />
                    {template.downloads} sales
                  </div>
                  <div className="flex items-center">
                    <Code className="w-4 h-4 mr-1" />
                    {template.tags.length} features
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    className="flex-1"
                    onClick={() => handlePurchase(template)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Buy Now
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowPreview(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>

                {/* Developer Earnings */}
                <div className="mt-3 pt-3 border-t text-center">
                  <p className="text-xs text-gray-500">
                    Developer earns: <span className="font-semibold text-green-600">${template.authorRevenue}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-500">No templates found. Try adjusting your filters.</p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedTemplate.name}</h2>
                  <p className="text-gray-600">{selectedTemplate.description}</p>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowPreview(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="features">
                <TabsList>
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="schema">Schema Preview</TabsTrigger>
                  <TabsTrigger value="docs">Documentation</TabsTrigger>
                </TabsList>
                
                <TabsContent value="features" className="mt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedTemplate.features.map((feature: string, idx: number) => (
                      <div key={idx} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="schema" className="mt-4">
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
                      <code>{selectedTemplate.schema}</code>
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="docs" className="mt-4">
                  <div className="prose dark:prose-invert max-w-none">
                    <p>{selectedTemplate.documentation}</p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-6 flex justify-end gap-4">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Close
                </Button>
                <Button onClick={() => handlePurchase(selectedTemplate)}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Purchase for ${selectedTemplate.price}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}