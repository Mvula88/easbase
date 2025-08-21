'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sparkles, 
  Database, 
  Zap, 
  Shield, 
  Code, 
  Copy, 
  Check,
  AlertCircle,
  TrendingUp,
  DollarSign,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

export default function DashboardPage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [stats, setStats] = useState({
    schemasGenerated: 0,
    cacheHitRate: 0,
    tokensSaved: 0,
    costSaved: 0
  });
  const { toast } = useToast();

  const generateSchema = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': localStorage.getItem('apiKey') || ''
        },
        body: JSON.stringify({ prompt })
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.cached) {
        toast({
          title: "Cache hit!",
          description: `Saved $${data.costSaved.toFixed(2)} by using cached result`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate schema",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold">
                <span className="bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
                  Easbase
                </span>
              </h1>
              <p className="text-gray-600 mt-1">Backend infrastructure at ease</p>
            </div>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            <Zap className="w-3 h-3 mr-1" />
            Pro Plan
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Schemas Generated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stats.schemasGenerated}</span>
                <Badge variant="secondary" className="text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +23%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Cache Hit Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stats.cacheHitRate}%</span>
                <Badge className="bg-green-500 text-white text-xs">
                  Optimal
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Tokens Saved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stats.tokensSaved}k</span>
                <span className="text-sm text-gray-500">this month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Cost Saved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">${stats.costSaved}</span>
                <Badge className="bg-cyan-500 text-white text-xs">
                  <DollarSign className="w-3 h-3" />
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schema Generator */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-500" />
              Schema Generator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="Describe your application in plain English... e.g., 'I need an e-commerce platform with products, categories, orders, customer reviews, and inventory tracking'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] resize-none"
              />

              <div className="flex gap-2">
                <Button
                  onClick={generateSchema}
                  disabled={loading || !prompt}
                  className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600"
                >
                  {loading ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Schema
                    </>
                  )}
                </Button>
                
                <Button variant="outline">
                  Use Template
                </Button>
              </div>

              {/* Quick Templates */}
              <div className="flex gap-2 flex-wrap">
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => setPrompt('SaaS application with teams, billing, and subscriptions')}
                >
                  SaaS Starter
                </Badge>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => setPrompt('E-commerce with products, cart, and payments')}
                >
                  E-commerce
                </Badge>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => setPrompt('Social network with users, posts, and comments')}
                >
                  Social
                </Badge>
              </div>
            </div>

            {/* Results */}
            {result && (
              <div className="mt-8">
                {result.cached && (
                  <Alert className="mb-4 bg-green-50 border-green-200">
                    <Zap className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Retrieved from cache • Saved ${result.costSaved.toFixed(2)} • 0ms latency
                    </AlertDescription>
                  </Alert>
                )}

                <Tabs defaultValue="sql" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="sql">SQL</TabsTrigger>
                    <TabsTrigger value="schema">Schema</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="deploy">Deploy</TabsTrigger>
                  </TabsList>

                  <TabsContent value="sql" className="mt-4">
                    <div className="relative">
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                        <code>{result.sql}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          navigator.clipboard.writeText(result.sql);
                          toast({ title: "Copied to clipboard" });
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="schema" className="mt-4">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{JSON.stringify(result.schema, null, 2)}</code>
                    </pre>
                  </TabsContent>

                  <TabsContent value="preview" className="mt-4">
                    <div className="grid gap-4">
                      {result.schema?.tables?.map((table: any) => (
                        <Card key={table.name}>
                          <CardHeader>
                            <CardTitle className="text-lg font-medium">
                              {table.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {table.columns.map((col: any) => (
                                <div key={col.name} className="flex justify-between items-center">
                                  <code className="text-sm">{col.name}</code>
                                  <Badge variant="outline" className="text-xs">
                                    {col.type}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="deploy" className="mt-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <Alert>
                            <Shield className="w-4 h-4" />
                            <AlertDescription>
                              Deploy this schema to your connected Supabase project
                            </AlertDescription>
                          </Alert>
                          
                          <div className="flex gap-2">
                            <Button className="flex-1">
                              Deploy to Development
                            </Button>
                            <Button variant="outline" className="flex-1">
                              Deploy to Production
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}