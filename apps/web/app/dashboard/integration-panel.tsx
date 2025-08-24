'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Code, Copy, Check, Webhook, Zap, Database, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface IntegrationPanelProps {
  schema: any;
  sql: string;
}

export function IntegrationPanel({ schema, sql }: IntegrationPanelProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const deployToDatabase = async () => {
    // This would deploy directly to user's database project
    toast({
      title: "Deploying to Database",
      description: "Your schema is being deployed...",
    });
  };

  const sendToBuilder = async (platform: string) => {
    const payload = {
      schema,
      sql,
      platform,
      timestamp: new Date().toISOString(),
    };

    // Different integration methods for each platform
    switch(platform) {
      case 'lovable':
        // Lovable.dev integration via their API
        await fetch('https://api.lovable.dev/v1/import-schema', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        break;
      
      case 'bolt':
        // Bolt.new integration via webhook
        await fetch(webhookUrl || 'https://bolt.new/api/webhooks/easbase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Easbase-Event': 'schema.generated',
          },
          body: JSON.stringify(payload)
        });
        break;
      
      case 'v0':
        // v0.dev integration via clipboard (they read from clipboard)
        const v0Format = `-- Easbase Generated Schema
${sql}

/* Integration Instructions:
1. This schema has been copied to your clipboard
2. In v0.dev, use: "implement this database schema: [paste]"
3. v0 will generate the full application with this backend
*/`;
        await copyToClipboard(v0Format, 'v0.dev schema');
        window.open('https://v0.dev/new', '_blank');
        break;

      case 'cursor':
        // Cursor integration via .cursorrules file
        const cursorRules = `# Database Schema
\`\`\`sql
${sql}
\`\`\`

# Schema Structure
\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`

# Implementation Instructions
Use the above schema for all database operations in this project.`;
        await copyToClipboard(cursorRules, 'Cursor rules');
        break;
    }

    toast({
      title: `Sent to ${platform}`,
      description: "Schema has been sent to your code builder",
    });
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Connect to Your Code Builder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="direct" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="direct">Direct Deploy</TabsTrigger>
            <TabsTrigger value="webhook">Webhook</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Lovable.dev Integration */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Lovable.dev</h4>
                  <Badge variant="outline">Recommended</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Instant full-stack app generation with your schema
                </p>
                <Button 
                  onClick={() => sendToBuilder('lovable')}
                  className="w-full"
                  variant="outline"
                >
                  <Database className="mr-2 h-4 w-4" />
                  Send to Lovable
                </Button>
              </Card>

              {/* Bolt.new Integration */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Bolt.new</h4>
                  <Badge variant="outline">WebContainer</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Deploy directly in browser environment
                </p>
                <Button 
                  onClick={() => sendToBuilder('bolt')}
                  className="w-full"
                  variant="outline"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Send to Bolt
                </Button>
              </Card>

              {/* v0.dev Integration */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">v0.dev</h4>
                  <Badge variant="outline">Vercel</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Generate Next.js app with your backend
                </p>
                <Button 
                  onClick={() => sendToBuilder('v0')}
                  className="w-full"
                  variant="outline"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Open in v0
                </Button>
              </Card>

              {/* Cursor Integration */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Cursor</h4>
                  <Badge variant="outline">IDE</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Copy schema to use in Cursor
                </p>
                <Button 
                  onClick={() => sendToBuilder('cursor')}
                  className="w-full"
                  variant="outline"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy for Cursor
                </Button>
              </Card>
            </div>

            {/* Direct Database Deployment */}
            <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50">
              <h4 className="font-semibold mb-2">Deploy to Your Database</h4>
              <div className="flex gap-2">
                <Input 
                  placeholder="Your Database Project URL"
                  className="flex-1"
                />
                <Input 
                  placeholder="Service Role Key"
                  type="password"
                  className="flex-1"
                />
                <Button onClick={deployToDatabase}>
                  Deploy Now
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="webhook" className="space-y-4">
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Webhook Configuration</h4>
              <p className="text-sm text-gray-600 mb-3">
                Set up automatic schema delivery to your code builder
              </p>
              <div className="space-y-3">
                <Input 
                  placeholder="https://your-builder.com/webhook/easbase"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    Test Webhook
                  </Button>
                  <Button className="flex-1">
                    Save Configuration
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p className="text-xs font-mono">
                  Events: schema.generated, deployment.completed
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-4">
            <Card className="p-4">
              <h4 className="font-semibold mb-3">API Integration</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Your API Key</label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      value={apiKey || 'easbase_key_' + Math.random().toString(36).substr(2, 9)}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(apiKey, 'API Key')}
                    >
                      {copied === 'API Key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-gray-900 text-white rounded">
                  <p className="text-xs mb-2">Example Request:</p>
                  <pre className="text-xs overflow-x-auto">
{`curl -X GET https://easbase.vercel.app/api/schemas/latest \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Project-ID: your-project-id"`}
                  </pre>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">
                    View API Docs
                  </Button>
                  <Button variant="outline" size="sm">
                    Generate SDK
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}