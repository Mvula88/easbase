'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { AI_PROMPT_TEMPLATES, getCategories } from '@/lib/ai/prompt-templates';
import { 
  Sparkles, 
  Rocket, 
  Clock, 
  Code, 
  Database,
  Shield,
  Zap,
  ChevronRight,
  Loader2,
  Check,
  Copy,
  Download
} from 'lucide-react';

export default function AIBuilderPage() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedBackend, setGeneratedBackend] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('templates');

  const categories = getCategories();

  const handleTemplateSelect = (template: any) => {
    setPrompt(template.prompt);
    setSelectedTemplate(template.id);
    setActiveTab('custom');
  };

  const generateBackend = async () => {
    if (!prompt) {
      toast({
        title: 'Error',
        description: 'Please describe your backend or select a template',
        variant: 'destructive'
      });
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/generate-ai-backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
          projectName: prompt.split(' ').slice(0, 3).join('-').toLowerCase()
        })
      });

      if (!response.ok) throw new Error('Generation failed');

      const data = await response.json();
      setGeneratedBackend(data);
      
      toast({
        title: '🎉 Backend Generated!',
        description: `Your ${data.design.projectName} backend is ready`,
      });
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'Please try again or contact support',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Code copied to clipboard',
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-4">
          <Sparkles className="w-12 h-12 text-yellow-500 mr-3" />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Backend Builder
          </h1>
        </div>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Describe your app idea, get a production-ready backend in 45 seconds
        </p>
        
        {/* Stats */}
        <div className="flex justify-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">12,453</div>
            <div className="text-sm text-gray-500">Backends Generated</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">45s</div>
            <div className="text-sm text-gray-500">Average Time</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">100%</div>
            <div className="text-sm text-gray-500">Production Ready</div>
          </div>
        </div>
      </div>

      {!generatedBackend ? (
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle>Create Your Backend</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="templates">
                  <Zap className="w-4 h-4 mr-2" />
                  Popular Templates
                </TabsTrigger>
                <TabsTrigger value="custom">
                  <Code className="w-4 h-4 mr-2" />
                  Custom Prompt
                </TabsTrigger>
              </TabsList>

              {/* Templates Tab */}
              <TabsContent value="templates" className="mt-6">
                <div className="grid gap-4">
                  {categories.map(category => (
                    <div key={category}>
                      <h3 className="text-lg font-semibold mb-3">{category}</h3>
                      <div className="grid md:grid-cols-2 gap-3">
                        {AI_PROMPT_TEMPLATES
                          .filter(t => t.category === category)
                          .map(template => (
                            <Card 
                              key={template.id}
                              className={`cursor-pointer transition-all hover:shadow-lg ${
                                selectedTemplate === template.id ? 'ring-2 ring-blue-500' : ''
                              }`}
                              onClick={() => handleTemplateSelect(template)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center mb-2">
                                      <span className="text-2xl mr-2">{template.icon}</span>
                                      <h4 className="font-semibold">{template.title}</h4>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">
                                      {template.description}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs">
                                      <Badge variant="secondary">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {template.estimatedTime}
                                      </Badge>
                                      <Badge variant="outline">
                                        {template.popularity}% popular
                                      </Badge>
                                    </div>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-gray-400" />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Custom Prompt Tab */}
              <TabsContent value="custom" className="mt-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Describe your backend in natural language
                    </label>
                    <Textarea
                      placeholder="Example: I need a backend for a fitness app where users can track workouts, set goals, follow trainers, and share progress with friends..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[150px]"
                    />
                  </div>

                  {/* AI Suggestions */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
                      AI will automatically include:
                    </h4>
                    <div className="grid md:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center">
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        Database schema & relationships
                      </div>
                      <div className="flex items-center">
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        Authentication & authorization
                      </div>
                      <div className="flex items-center">
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        REST API endpoints
                      </div>
                      <div className="flex items-center">
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        Row Level Security (RLS)
                      </div>
                      <div className="flex items-center">
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        Real-time subscriptions
                      </div>
                      <div className="flex items-center">
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        File storage setup
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Generate Button */}
            <div className="mt-6 flex justify-center">
              <Button 
                size="lg" 
                onClick={generateBackend}
                disabled={generating || !prompt}
                className="px-8"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Your Backend...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5 mr-2" />
                    Generate Backend Now
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Results Section */
        <div className="space-y-6">
          <Card className="shadow-2xl border-green-500">
            <CardHeader className="bg-green-50 dark:bg-green-900/20">
              <CardTitle className="flex items-center">
                <Check className="w-6 h-6 mr-2 text-green-500" />
                Backend Generated Successfully!
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Project Details</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-500">Name:</span>
                      <p className="font-mono">{generatedBackend.design.projectName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Description:</span>
                      <p>{generatedBackend.design.description}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Estimated Cost:</span>
                      <p className="text-lg font-bold">${generatedBackend.design.estimatedCost}/month</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">What's Included</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Database className="w-4 h-4 mr-2 text-blue-500" />
                      {generatedBackend.design.tables.length} Database Tables
                    </div>
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-green-500" />
                      {generatedBackend.design.apis.length} API Endpoints
                    </div>
                    <div className="flex items-center">
                      <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                      Real-time Subscriptions
                    </div>
                    <div className="flex items-center">
                      <Check className="w-4 h-4 mr-2 text-purple-500" />
                      Authentication Ready
                    </div>
                  </div>
                </div>
              </div>

              {/* Schema Preview */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Database Schema</h3>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => copyToClipboard(generatedBackend.schema)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy SQL
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">
                    <code>{generatedBackend.schema || '-- Schema will appear here'}</code>
                  </pre>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-center gap-4">
                <Button size="lg" className="px-8">
                  <Rocket className="w-5 h-5 mr-2" />
                  Deploy This Backend
                </Button>
                <Button size="lg" variant="outline" onClick={() => setGeneratedBackend(null)}>
                  Generate Another
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}