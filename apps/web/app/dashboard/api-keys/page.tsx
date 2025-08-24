import { redirect } from 'next/navigation';
import { createClient } from '@/lib/auth/supabase-server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Key, 
  Copy, 
  Eye, 
  EyeOff, 
  Trash2, 
  Plus,
  Shield,
  AlertCircle,
  Code2,
  Terminal
} from 'lucide-react';

export default async function ApiKeysPage() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/onboarding');
  }

  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">API Keys</h1>
        <p className="text-gray-600">Manage your API keys for programmatic access to your backends</p>
      </div>

      <Alert className="mb-6 border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Important:</strong> Keep your API keys secure. Never expose them in client-side code or public repositories.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your API Keys</CardTitle>
                <CardDescription>
                  Use these keys to authenticate API requests to your backends
                </CardDescription>
              </div>
              <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Generate New Key
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {apiKeys && apiKeys.length > 0 ? (
              <div className="space-y-4">
                {apiKeys.map((key: any) => (
                  <div key={key.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-cyan-500" />
                        <div>
                          <p className="font-medium">{key.name || 'API Key'}</p>
                          <p className="text-sm text-gray-500">
                            Created: {new Date(key.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {key.last_used_at ? (
                          <Badge variant="outline" className="text-xs">
                            Last used: {new Date(key.last_used_at).toLocaleDateString()}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Never used
                          </Badge>
                        )}
                        <Button variant="ghost" size="icon">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                        sk_live_••••••••••••••••{key.key_suffix}
                      </code>
                      <Button variant="outline" size="icon">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                    {key.permissions && (
                      <div className="flex gap-2 mt-3">
                        {key.permissions.includes('read') && (
                          <Badge className="bg-green-100 text-green-700">Read</Badge>
                        )}
                        {key.permissions.includes('write') && (
                          <Badge className="bg-blue-100 text-blue-700">Write</Badge>
                        )}
                        {key.permissions.includes('delete') && (
                          <Badge className="bg-red-100 text-red-700">Delete</Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No API keys yet</p>
                <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Your First Key
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="w-5 h-5" />
              Quick Start Guide
            </CardTitle>
            <CardDescription>
              Learn how to use your API keys to interact with your backends
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Using with cURL
              </h3>
              <div className="bg-gray-900 text-white p-4 rounded-lg">
                <code className="text-sm">
                  {`curl -X GET https://api.easbase.com/v1/your-backend \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
                </code>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Using with JavaScript</h3>
              <div className="bg-gray-900 text-white p-4 rounded-lg">
                <code className="text-sm">
                  {`const response = await fetch('https://api.easbase.com/v1/your-backend', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();`}
                </code>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Rate Limits</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-3">
                  <p className="text-sm text-gray-600">Requests per minute</p>
                  <p className="text-2xl font-bold">60</p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-sm text-gray-600">Requests per day</p>
                  <p className="text-2xl font-bold">10,000</p>
                </div>
              </div>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                All API requests must include a valid API key in the Authorization header. 
                Keys are scoped to your account and can access all your backends.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}