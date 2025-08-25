'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Code,
  Database,
  FileJson,
  Terminal,
  Eye,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Shield,
  Zap,
  Server,
  ChevronRight,
} from 'lucide-react';

interface TemplatePreviewProps {
  templateId: string;
  templateName: string;
  schema: string;
  features: string[];
  documentation: string;
  demoUrl?: string;
}

export function TemplatePreview({
  templateId,
  templateName,
  schema,
  features,
  documentation,
  demoUrl,
}: TemplatePreviewProps) {
  const [activeTab, setActiveTab] = useState('demo');
  const [loading, setLoading] = useState(false);
  const [demoData, setDemoData] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Simulated demo data based on template
  const getDemoData = () => {
    switch (templateId) {
      case 'uber-clone':
        return {
          endpoints: [
            { method: 'GET', path: '/api/drivers/nearby', description: 'Find drivers within radius' },
            { method: 'POST', path: '/api/rides/request', description: 'Request a new ride' },
            { method: 'GET', path: '/api/rides/:id/track', description: 'Real-time ride tracking' },
            { method: 'POST', path: '/api/payments/process', description: 'Process ride payment' },
          ],
          sampleResponse: {
            ride: {
              id: 'ride_123',
              driver: {
                name: 'John Smith',
                rating: 4.8,
                vehicle: 'Toyota Camry',
                plate: 'ABC-123',
              },
              pickup: '123 Main St',
              dropoff: '456 Oak Ave',
              fare: 24.50,
              status: 'in_progress',
              eta: '5 mins',
            },
          },
          realtimeEvents: [
            'driver.location.updated',
            'ride.status.changed',
            'payment.processed',
          ],
        };
      case 'airbnb-clone':
        return {
          endpoints: [
            { method: 'GET', path: '/api/properties/search', description: 'Search available properties' },
            { method: 'POST', path: '/api/bookings/create', description: 'Create new booking' },
            { method: 'GET', path: '/api/properties/:id', description: 'Get property details' },
            { method: 'POST', path: '/api/reviews/submit', description: 'Submit property review' },
          ],
          sampleResponse: {
            property: {
              id: 'prop_456',
              title: 'Cozy Downtown Apartment',
              host: 'Sarah Johnson',
              price: 120,
              rating: 4.9,
              amenities: ['WiFi', 'Kitchen', 'Parking'],
              available: true,
            },
          },
          realtimeEvents: [
            'booking.confirmed',
            'message.received',
            'review.posted',
          ],
        };
      default:
        return null;
    }
  };

  useEffect(() => {
    setDemoData(getDemoData());
  }, [templateId]);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const runLiveDemo = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      // In production, this would make actual API calls to the demo backend
    }, 2000);
  };

  const sampleCode = {
    javascript: `// Initialize connection
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_PROJECT_URL',
  'YOUR_ANON_KEY'
)

// Example: ${templateName}
async function example() {
  const { data, error } = await supabase
    .from('${templateId.replace('-', '_')}')
    .select('*')
    .limit(10)
    
  if (error) console.error(error)
  return data
}`,
    python: `# Initialize connection
from supabase import create_client

supabase = create_client(
    'YOUR_PROJECT_URL',
    'YOUR_ANON_KEY'
)

# Example: ${templateName}
def example():
    response = supabase.table('${templateId.replace('-', '_')}') \\
        .select("*") \\
        .limit(10) \\
        .execute()
    
    return response.data`,
    curl: `# Example API call
curl -X GET \\
  'https://YOUR_PROJECT_URL/rest/v1/${templateId.replace('-', '_')}?limit=10' \\
  -H 'apikey: YOUR_ANON_KEY' \\
  -H 'Authorization: Bearer YOUR_ANON_KEY'`,
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl mb-2">{templateName} - Live Preview</CardTitle>
              <p className="text-blue-100">
                Test drive this backend template before purchasing
              </p>
            </div>
            {demoUrl && (
              <Button variant="secondary" onClick={() => window.open(demoUrl, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Full Demo
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="demo">
                <Play className="w-4 h-4 mr-2" />
                Live Demo
              </TabsTrigger>
              <TabsTrigger value="api">
                <Terminal className="w-4 h-4 mr-2" />
                API Explorer
              </TabsTrigger>
              <TabsTrigger value="schema">
                <Database className="w-4 h-4 mr-2" />
                Schema
              </TabsTrigger>
              <TabsTrigger value="code">
                <Code className="w-4 h-4 mr-2" />
                Code Examples
              </TabsTrigger>
              <TabsTrigger value="features">
                <Zap className="w-4 h-4 mr-2" />
                Features
              </TabsTrigger>
            </TabsList>

            {/* Live Demo Tab */}
            <TabsContent value="demo" className="mt-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Interactive Demo Environment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-900 text-white p-6 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-sm">Demo Server Running</span>
                        </div>
                        <Button
                          onClick={runLiveDemo}
                          disabled={loading}
                          variant="secondary"
                          size="sm"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Running...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Run Demo
                            </>
                          )}
                        </Button>
                      </div>

                      {demoData && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm text-gray-400 mb-2">Sample Response:</h4>
                            <pre className="bg-gray-800 p-4 rounded overflow-x-auto">
                              <code>{JSON.stringify(demoData.sampleResponse, null, 2)}</code>
                            </pre>
                          </div>

                          <div>
                            <h4 className="text-sm text-gray-400 mb-2">Real-time Events:</h4>
                            <div className="flex flex-wrap gap-2">
                              {demoData.realtimeEvents.map((event: string) => (
                                <Badge key={event} variant="secondary">
                                  {event}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <Server className="w-8 h-8 text-blue-600 mb-2" />
                      <h3 className="font-semibold mb-1">99.9% Uptime</h3>
                      <p className="text-sm text-gray-600">Production-ready infrastructure</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <Shield className="w-8 h-8 text-green-600 mb-2" />
                      <h3 className="font-semibold mb-1">Secure by Default</h3>
                      <p className="text-sm text-gray-600">RLS policies pre-configured</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <Zap className="w-8 h-8 text-purple-600 mb-2" />
                      <h3 className="font-semibold mb-1">Lightning Fast</h3>
                      <p className="text-sm text-gray-600">Optimized for performance</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* API Explorer Tab */}
            <TabsContent value="api" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">API Endpoints</CardTitle>
                </CardHeader>
                <CardContent>
                  {demoData && (
                    <div className="space-y-3">
                      {demoData.endpoints.map((endpoint: any, idx: number) => (
                        <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge
                                variant={endpoint.method === 'GET' ? 'default' : 'secondary'}
                                className="font-mono"
                              >
                                {endpoint.method}
                              </Badge>
                              <code className="text-sm">{endpoint.path}</code>
                            </div>
                            <Button variant="ghost" size="sm">
                              Try it <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">{endpoint.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Schema Tab */}
            <TabsContent value="schema" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Database Schema</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyCode(schema, 'schema')}
                    >
                      {copiedCode === 'schema' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm">
                      <code>{schema}</code>
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Code Examples Tab */}
            <TabsContent value="code" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Start Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="javascript">
                    <TabsList>
                      <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                      <TabsTrigger value="python">Python</TabsTrigger>
                      <TabsTrigger value="curl">cURL</TabsTrigger>
                    </TabsList>

                    {Object.entries(sampleCode).map(([lang, code]) => (
                      <TabsContent key={lang} value={lang}>
                        <div className="relative">
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => copyCode(code, lang)}
                          >
                            {copiedCode === lang ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                            <pre className="text-sm">
                              <code>{code}</code>
                            </pre>
                          </div>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Included Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-green-600" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <h4 className="font-semibold mb-2">What you get:</h4>
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <li>• Complete source code access</li>
                      <li>• Lifetime updates</li>
                      <li>• Commercial license</li>
                      <li>• Priority support</li>
                      <li>• Deployment guides</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}