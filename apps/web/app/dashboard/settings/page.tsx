'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Key, 
  Shield, 
  Bell,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Settings,
  Lock,
  Mail,
  Smartphone,
  Building2,
  Eye,
  EyeOff
} from 'lucide-react';
import { createClient } from '@/lib/auth/supabase-client';
import { useToast } from '@/components/ui/use-toast';

interface UserSettings {
  profile: {
    id: string;
    email: string;
    fullName: string;
    companyName?: string;
    avatarUrl?: string;
    role: string;
  };
  security: {
    emailVerified: boolean;
    phoneVerified: boolean;
    twoFactorEnabled: boolean;
    lastPasswordChange?: string;
  };
  notifications: {
    emailNotifications: boolean;
    securityAlerts: boolean;
    marketingEmails: boolean;
    weeklyReports: boolean;
  };
  apiKeys: Array<{
    id: string;
    name: string;
    key: string;
    createdAt: string;
    lastUsed?: string;
    permissions: string[];
  }>;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [creatingApiKey, setCreatingApiKey] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/login');
        return;
      }
      
      await fetchSettings();
    }

    checkAuth();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) {
        router.push('/onboarding');
        return;
      }

      // Fetch API keys
      const { data: apiKeys } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Mock settings data - replace with actual data
      const mockSettings: UserSettings = {
        profile: {
          id: user.id,
          email: user.email || '',
          fullName: profile.full_name || '',
          companyName: profile.company_name || '',
          avatarUrl: profile.avatar_url,
          role: profile.role || 'user'
        },
        security: {
          emailVerified: user.email_confirmed_at !== null,
          phoneVerified: user.phone_confirmed_at !== null,
          twoFactorEnabled: false,
          lastPasswordChange: '2024-01-15T00:00:00Z'
        },
        notifications: {
          emailNotifications: true,
          securityAlerts: true,
          marketingEmails: false,
          weeklyReports: true
        },
        apiKeys: apiKeys?.map(key => ({
          id: key.id,
          name: key.name,
          key: key.key_preview,
          createdAt: key.created_at,
          lastUsed: key.last_used_at,
          permissions: key.permissions || []
        })) || []
      };

      setSettings(mockSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserSettings['profile']>) => {
    if (!settings) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: updates.fullName,
          company_name: updates.companyName
        })
        .eq('id', settings.profile.id);

      if (error) throw error;

      setSettings(prev => prev ? {
        ...prev,
        profile: { ...prev.profile, ...updates }
      } : null);

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateNotifications = async (updates: Partial<UserSettings['notifications']>) => {
    if (!settings) return;

    try {
      // Update notifications in database (mock implementation)
      setSettings(prev => prev ? {
        ...prev,
        notifications: { ...prev.notifications, ...updates }
      } : null);

      toast({
        title: "Success",
        description: "Notification preferences updated"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notifications",
        variant: "destructive"
      });
    }
  };

  const createApiKey = async () => {
    if (!newApiKeyName.trim() || !settings) return;

    try {
      setCreatingApiKey(true);
      
      const response = await fetch('/api/auth/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newApiKeyName })
      });

      if (!response.ok) throw new Error('Failed to create API key');

      const newKey = await response.json();
      
      setSettings(prev => prev ? {
        ...prev,
        apiKeys: [newKey, ...prev.apiKeys]
      } : null);

      setNewApiKeyName('');
      toast({
        title: "Success",
        description: "API key created successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive"
      });
    } finally {
      setCreatingApiKey(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!settings) return;
    
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/auth/api-keys/${keyId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete API key');

      setSettings(prev => prev ? {
        ...prev,
        apiKeys: prev.apiKeys.filter(key => key.id !== keyId)
      } : null);

      toast({
        title: "Success",
        description: "API key deleted successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete API key",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({
      title: "Copied",
      description: "API key copied to clipboard"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Settings</h1>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-gray-600">Manage your account preferences and security settings</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Keys
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={settings.profile.fullName}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        profile: { ...prev.profile, fullName: e.target.value }
                      } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={settings.profile.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">Email cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name</Label>
                    <Input
                      id="company"
                      value={settings.profile.companyName || ''}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        profile: { ...prev.profile, companyName: e.target.value }
                      } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{settings.profile.role}</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    onClick={() => updateProfile({
                      fullName: settings.profile.fullName,
                      companyName: settings.profile.companyName
                    })}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Security</CardTitle>
                  <CardDescription>Manage your security preferences and authentication methods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-medium">Email Verification</p>
                        <p className="text-sm text-gray-600">Verify your email address for security</p>
                      </div>
                    </div>
                    <Badge variant={settings.security.emailVerified ? "default" : "secondary"}>
                      {settings.security.emailVerified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">Phone Verification</p>
                        <p className="text-sm text-gray-600">Add a phone number for extra security</p>
                      </div>
                    </div>
                    <Badge variant={settings.security.phoneVerified ? "default" : "secondary"}>
                      {settings.security.phoneVerified ? 'Verified' : 'Not Set'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch 
                        checked={settings.security.twoFactorEnabled}
                        onCheckedChange={(checked) => setSettings(prev => prev ? {
                          ...prev,
                          security: { ...prev.security, twoFactorEnabled: checked }
                        } : null)}
                      />
                      <span className="text-sm text-gray-600">
                        {settings.security.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>Manage your account password</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Password</p>
                      <p className="text-sm text-gray-600">
                        Last changed: {settings.security.lastPasswordChange ? 
                          new Date(settings.security.lastPasswordChange).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                    <Button variant="outline">
                      Change Password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what notifications you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive important updates via email</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.emailNotifications}
                      onCheckedChange={(checked) => updateNotifications({ emailNotifications: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Security Alerts</p>
                      <p className="text-sm text-gray-600">Get notified about security events</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.securityAlerts}
                      onCheckedChange={(checked) => updateNotifications({ securityAlerts: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Marketing Emails</p>
                      <p className="text-sm text-gray-600">Receive product updates and offers</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.marketingEmails}
                      onCheckedChange={(checked) => updateNotifications({ marketingEmails: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Weekly Reports</p>
                      <p className="text-sm text-gray-600">Get weekly usage and activity reports</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.weeklyReports}
                      onCheckedChange={(checked) => updateNotifications({ weeklyReports: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>Manage your API keys for programmatic access</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <Input
                        placeholder="API key name (e.g., Production App)"
                        value={newApiKeyName}
                        onChange={(e) => setNewApiKeyName(e.target.value)}
                      />
                      <Button 
                        onClick={createApiKey}
                        disabled={!newApiKeyName.trim() || creatingApiKey}
                      >
                        {creatingApiKey ? 'Creating...' : 'Create Key'}
                      </Button>
                    </div>

                    {settings.apiKeys.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Key className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No API keys created yet</p>
                        <p className="text-sm">Create your first API key to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {settings.apiKeys.map((apiKey) => (
                          <div key={apiKey.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <p className="font-medium">{apiKey.name}</p>
                                <Badge variant="secondary" className="text-xs">
                                  Created {new Date(apiKey.createdAt).toLocaleDateString()}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                                  {showApiKey === apiKey.id ? apiKey.key : '•'.repeat(32)}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowApiKey(showApiKey === apiKey.id ? null : apiKey.id)}
                                >
                                  {showApiKey === apiKey.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                                >
                                  {copiedKey === apiKey.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </Button>
                              </div>
                              {apiKey.lastUsed && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Last used: {new Date(apiKey.lastUsed).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteApiKey(apiKey.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Keep your API keys secure and never share them publicly. If an API key is compromised, delete it immediately and create a new one.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}