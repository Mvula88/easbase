'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/auth/supabase-client';
import { 
  Copy, 
  ExternalLink, 
  Settings, 
  Database, 
  Key, 
  Shield,
  Mail,
  CreditCard,
  HardDrive,
  Activity,
  Code,
  Book,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';

interface Project {
  id: string;
  project_name: string;
  business_type: string;
  api_key: string;
  status: string;
  features: any;
  metadata: any;
  created_at: string;
  updated_at: string;
  supabase_url?: string;
  supabase_anon_key?: string;
}

interface Feature {
  id: string;
  name: string;
  icon: any;
  enabled: boolean;
  description: string;
  config?: any;
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const projectId = params.projectId as string;

  const features: Feature[] = [
    { id: 'auth', name: 'Authentication', icon: Shield, enabled: project?.features?.auth || false, description: 'User login, SSO, 2FA' },
    { id: 'database', name: 'Database', icon: Database, enabled: project?.features?.database || false, description: 'PostgreSQL with real-time' },
    { id: 'storage', name: 'File Storage', icon: HardDrive, enabled: project?.features?.storage || false, description: 'Images, documents, CDN' },
    { id: 'email', name: 'Email Service', icon: Mail, enabled: project?.features?.email || false, description: 'Transactional emails' },
    { id: 'payments', name: 'Payments', icon: CreditCard, enabled: project?.features?.payments || false, description: 'Stripe integration' },
  ];

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('customer_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error: any) {
      console.error('Error fetching project:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project details',
        variant: 'destructive'
      });
      router.push('/dashboard/projects');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`
    });
  };

  const handleRegenerateApiKey = async () => {
    setRegenerating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/regenerate-key`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to regenerate API key');
      
      const data = await response.json();
      setProject(prev => prev ? { ...prev, api_key: data.apiKey } : null);
      
      toast({
        title: 'Success',
        description: 'API key regenerated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to regenerate API key',
        variant: 'destructive'
      });
    } finally {
      setRegenerating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('customer_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Project deleted successfully'
      });
      
      router.push('/dashboard/projects');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleFeatureToggle = async (featureId: string, enabled: boolean) => {
    try {
      const supabase = createClient();
      const updatedFeatures = {
        ...project?.features,
        [featureId]: enabled
      };

      const { error } = await supabase
        .from('customer_projects')
        .update({ features: updatedFeatures })
        .eq('id', projectId);

      if (error) throw error;

      setProject(prev => prev ? { ...prev, features: updatedFeatures } : null);
      
      toast({
        title: 'Success',
        description: `Feature ${enabled ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update feature',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold">Project not found</h2>
        <Button onClick={() => router.push('/dashboard/projects')} className="mt-4">
          Back to Projects
        </Button>
      </div>
    );
  }

  const apiEndpoint = `${process.env.NEXT_PUBLIC_APP_URL || 'https://easbase.vercel.app'}/api/v1/${project.id}`;

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">{project.project_name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
              {project.status}
            </Badge>
            <Badge variant="outline">{project.business_type}</Badge>
            <span className="text-sm text-gray-500">
              Created {new Date(project.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/projects')}>
            Back to Projects
          </Button>
          <Button variant="destructive" onClick={handleDeleteProject} disabled={deleting}>
            {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Delete Project
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="api">API Configuration</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">API Endpoint</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <code className="text-xs bg-gray-100 p-1 rounded truncate max-w-[200px]">
                    {apiEndpoint}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(apiEndpoint, 'API Endpoint')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Active Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-2xl font-bold">
                    {Object.values(project.features || {}).filter(Boolean).length}
                  </span>
                  <span className="text-sm text-gray-500">/ {features.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">API Calls (30d)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-2xl font-bold">0</span>
                  <span className="text-sm text-gray-500">requests</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Start Guide */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Quick Start</CardTitle>
              <CardDescription>Get started with your backend in minutes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">1. Install SDK</h4>
                <code className="block bg-gray-100 p-3 rounded text-sm">
                  npm install @easbase/sdk
                </code>
              </div>
              <div>
                <h4 className="font-medium mb-2">2. Initialize Client</h4>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`import { EasbaseClient } from '@easbase/sdk';

const client = new EasbaseClient({
  apiKey: '${project.api_key.substring(0, 20)}...',
  projectId: '${project.id}'
});`}
                </pre>
              </div>
              <div>
                <h4 className="font-medium mb-2">3. Make Your First Request</h4>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`// Create a new record
const { data, error } = await client
  .from('your_table')
  .insert({ name: 'John Doe', email: 'john@example.com' });`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Configuration Tab */}
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>Manage your API credentials and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>API Key</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={project.api_key}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(project.api_key, 'API Key')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRegenerateApiKey}
                    disabled={regenerating}
                  >
                    {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Keep your API key secure. Never commit it to version control.
                </p>
              </div>

              <div>
                <Label>Project ID</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    value={project.id}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(project.id, 'Project ID')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Base URL</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    value={apiEndpoint}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(apiEndpoint, 'Base URL')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Backend Endpoints - Show Easbase branded URLs */}
              <div>
                <Label>API Endpoint</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    value={apiEndpoint}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigator.clipboard.writeText(apiEndpoint)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Use this endpoint for all API calls
                </p>
              </div>
            </CardContent>
          </Card>

          {/* CORS Settings */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>CORS Settings</CardTitle>
              <CardDescription>Configure allowed origins for your API</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Allow all origins (*)</Label>
                  <Switch defaultChecked />
                </div>
                <p className="text-sm text-gray-500">
                  Currently allowing requests from all origins. You can restrict this in production.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Project Features</CardTitle>
              <CardDescription>Enable or disable features for your backend</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium">{feature.name}</p>
                          <p className="text-sm text-gray-500">{feature.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={feature.enabled}
                        onCheckedChange={(checked) => handleFeatureToggle(feature.id, checked)}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="documentation">
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <CardDescription>Complete reference for your backend API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Authentication</h3>
                <p className="text-sm text-gray-600 mb-3">
                  All API requests must include your API key in the Authorization header:
                </p>
                <pre className="bg-gray-100 p-3 rounded text-sm">
{`Authorization: Bearer ${project.api_key.substring(0, 20)}...`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Available Endpoints</h3>
                <div className="space-y-3">
                  <div className="border rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-500">GET</Badge>
                      <code className="text-sm">/api/v1/{projectId}/data</code>
                    </div>
                    <p className="text-sm text-gray-600">Retrieve data from your database</p>
                  </div>
                  
                  <div className="border rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-blue-500">POST</Badge>
                      <code className="text-sm">/api/v1/{projectId}/data</code>
                    </div>
                    <p className="text-sm text-gray-600">Create new records in your database</p>
                  </div>
                  
                  <div className="border rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-yellow-500">PATCH</Badge>
                      <code className="text-sm">/api/v1/{projectId}/data/:id</code>
                    </div>
                    <p className="text-sm text-gray-600">Update existing records</p>
                  </div>
                  
                  <div className="border rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-red-500">DELETE</Badge>
                      <code className="text-sm">/api/v1/{projectId}/data/:id</code>
                    </div>
                    <p className="text-sm text-gray-600">Delete records from your database</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">SDKs & Libraries</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <Button variant="outline" className="justify-start">
                    <Code className="w-4 h-4 mr-2" />
                    JavaScript/TypeScript SDK
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Code className="w-4 h-4 mr-2" />
                    Python SDK
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Code className="w-4 h-4 mr-2" />
                    React Hooks
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Code className="w-4 h-4 mr-2" />
                    REST API Reference
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <div className="flex items-start gap-2">
                  <Book className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Need help?</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Check out our <a href="#" className="underline">complete documentation</a> or{' '}
                      <a href="#" className="underline">contact support</a> for assistance.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}