'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Shield,
  Bell,
  Database,
  Mail,
  Key,
  Globe,
  Zap,
  AlertTriangle,
  CheckCircle,
  Save,
  RefreshCw,
  HardDrive,
  CreditCard,
  Users,
  Lock,
  Server,
  Cloud,
  Activity
} from 'lucide-react';

export default function SystemSettings() {
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  
  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    platformName: 'Easbase',
    platformUrl: 'https://easbase.vercel.app',
    supportEmail: 'support@easbase.dev',
    defaultTimezone: 'UTC',
    maintenanceMode: false,
    debugMode: false,
    allowSignups: true,
    requireEmailVerification: true
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    enforceHttps: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    passwordMinLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    enforce2FA: false,
    allowedDomains: '',
    ipWhitelist: '',
    rateLimitRequests: 100,
    rateLimitWindow: 60
  });

  // Email Settings
  const [emailSettings, setEmailSettings] = useState({
    provider: 'sendgrid',
    apiKey: '••••••••••••••••',
    fromEmail: 'noreply@easbase.dev',
    fromName: 'Easbase',
    replyToEmail: 'support@easbase.dev',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: ''
  });

  // Storage Settings
  const [storageSettings, setStorageSettings] = useState({
    provider: 'supabase',
    maxFileSize: 10,
    allowedFileTypes: 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx',
    publicBucket: 'public',
    privateBucket: 'private',
    cdnEnabled: true,
    cdnUrl: 'https://cdn.easbase.dev',
    autoDeleteAfter: 90
  });

  // Database Settings
  const [databaseSettings, setDatabaseSettings] = useState({
    connectionPoolSize: 20,
    queryTimeout: 30,
    enableQueryLogging: false,
    backupEnabled: true,
    backupFrequency: 'daily',
    backupRetention: 30,
    maintenanceWindow: '02:00-04:00 UTC'
  });

  const handleSave = async (section: string) => {
    setSaving(true);
    try {
      // Save settings to API
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`Saving ${section} settings...`);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (service: string) => {
    setTestingConnection(service);
    try {
      // Test connection to service
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log(`Testing ${service} connection...`);
    } catch (error) {
      console.error('Connection test failed:', error);
    } finally {
      setTestingConnection(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-gray-500 mt-1">Configure platform settings and integrations</p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Configuration</CardTitle>
              <CardDescription>Basic platform settings and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="platform-name">Platform Name</Label>
                  <Input
                    id="platform-name"
                    value={generalSettings.platformName}
                    onChange={(e) => setGeneralSettings({...generalSettings, platformName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="platform-url">Platform URL</Label>
                  <Input
                    id="platform-url"
                    value={generalSettings.platformUrl}
                    onChange={(e) => setGeneralSettings({...generalSettings, platformUrl: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input
                    id="support-email"
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={(e) => setGeneralSettings({...generalSettings, supportEmail: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <Select value={generalSettings.defaultTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="maintenance">Maintenance Mode</Label>
                    <p className="text-sm text-gray-500">Temporarily disable access to the platform</p>
                  </div>
                  <Switch
                    id="maintenance"
                    checked={generalSettings.maintenanceMode}
                    onCheckedChange={(checked) => setGeneralSettings({...generalSettings, maintenanceMode: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="debug">Debug Mode</Label>
                    <p className="text-sm text-gray-500">Enable detailed error messages and logging</p>
                  </div>
                  <Switch
                    id="debug"
                    checked={generalSettings.debugMode}
                    onCheckedChange={(checked) => setGeneralSettings({...generalSettings, debugMode: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="signups">Allow New Signups</Label>
                    <p className="text-sm text-gray-500">Allow new users to create accounts</p>
                  </div>
                  <Switch
                    id="signups"
                    checked={generalSettings.allowSignups}
                    onCheckedChange={(checked) => setGeneralSettings({...generalSettings, allowSignups: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-verification">Require Email Verification</Label>
                    <p className="text-sm text-gray-500">Users must verify their email before accessing the platform</p>
                  </div>
                  <Switch
                    id="email-verification"
                    checked={generalSettings.requireEmailVerification}
                    onCheckedChange={(checked) => setGeneralSettings({...generalSettings, requireEmailVerification: checked})}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('general')} disabled={saving}>
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Configuration</CardTitle>
              <CardDescription>Configure authentication and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Changes to security settings may affect user access. Ensure you understand the implications before making changes.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="login-attempts">Max Login Attempts</Label>
                  <Input
                    id="login-attempts"
                    type="number"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => setSecuritySettings({...securitySettings, maxLoginAttempts: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="lockout-duration">Lockout Duration (minutes)</Label>
                  <Input
                    id="lockout-duration"
                    type="number"
                    value={securitySettings.lockoutDuration}
                    onChange={(e) => setSecuritySettings({...securitySettings, lockoutDuration: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="password-length">Min Password Length</Label>
                  <Input
                    id="password-length"
                    type="number"
                    value={securitySettings.passwordMinLength}
                    onChange={(e) => setSecuritySettings({...securitySettings, passwordMinLength: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Password Requirements</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="uppercase"
                      checked={securitySettings.requireUppercase}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, requireUppercase: checked})}
                    />
                    <Label htmlFor="uppercase">Require uppercase letters</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="numbers"
                      checked={securitySettings.requireNumbers}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, requireNumbers: checked})}
                    />
                    <Label htmlFor="numbers">Require numbers</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="special"
                      checked={securitySettings.requireSpecialChars}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, requireSpecialChars: checked})}
                    />
                    <Label htmlFor="special">Require special characters</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="2fa"
                      checked={securitySettings.enforce2FA}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, enforce2FA: checked})}
                    />
                    <Label htmlFor="2fa">Enforce 2FA for all users</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Access Control</h3>
                <div>
                  <Label htmlFor="allowed-domains">Allowed Email Domains (comma-separated)</Label>
                  <Input
                    id="allowed-domains"
                    placeholder="example.com, company.org"
                    value={securitySettings.allowedDomains}
                    onChange={(e) => setSecuritySettings({...securitySettings, allowedDomains: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to allow all domains</p>
                </div>
                <div>
                  <Label htmlFor="ip-whitelist">IP Whitelist (comma-separated)</Label>
                  <Textarea
                    id="ip-whitelist"
                    placeholder="192.168.1.1, 10.0.0.0/24"
                    value={securitySettings.ipWhitelist}
                    onChange={(e) => setSecuritySettings({...securitySettings, ipWhitelist: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to allow all IPs</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Rate Limiting</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rate-limit">Requests per Window</Label>
                    <Input
                      id="rate-limit"
                      type="number"
                      value={securitySettings.rateLimitRequests}
                      onChange={(e) => setSecuritySettings({...securitySettings, rateLimitRequests: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rate-window">Window Size (seconds)</Label>
                    <Input
                      id="rate-window"
                      type="number"
                      value={securitySettings.rateLimitWindow}
                      onChange={(e) => setSecuritySettings({...securitySettings, rateLimitWindow: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('security')} disabled={saving}>
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>Configure email service providers and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="email-provider">Email Provider</Label>
                <Select value={emailSettings.provider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="ses">Amazon SES</SelectItem>
                    <SelectItem value="mailgun">Mailgun</SelectItem>
                    <SelectItem value="smtp">Custom SMTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {emailSettings.provider !== 'smtp' ? (
                <div>
                  <Label htmlFor="api-key">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-key"
                      type="password"
                      value={emailSettings.apiKey}
                      onChange={(e) => setEmailSettings({...emailSettings, apiKey: e.target.value})}
                    />
                    <Button
                      variant="outline"
                      onClick={() => testConnection('email')}
                      disabled={testingConnection === 'email'}
                    >
                      {testingConnection === 'email' ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        'Test'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtp-host">SMTP Host</Label>
                    <Input
                      id="smtp-host"
                      value={emailSettings.smtpHost}
                      onChange={(e) => setEmailSettings({...emailSettings, smtpHost: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtp-port">SMTP Port</Label>
                    <Input
                      id="smtp-port"
                      type="number"
                      value={emailSettings.smtpPort}
                      onChange={(e) => setEmailSettings({...emailSettings, smtpPort: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtp-user">SMTP Username</Label>
                    <Input
                      id="smtp-user"
                      value={emailSettings.smtpUser}
                      onChange={(e) => setEmailSettings({...emailSettings, smtpUser: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtp-password">SMTP Password</Label>
                    <Input
                      id="smtp-password"
                      type="password"
                      value={emailSettings.smtpPassword}
                      onChange={(e) => setEmailSettings({...emailSettings, smtpPassword: e.target.value})}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from-email">From Email</Label>
                  <Input
                    id="from-email"
                    type="email"
                    value={emailSettings.fromEmail}
                    onChange={(e) => setEmailSettings({...emailSettings, fromEmail: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="from-name">From Name</Label>
                  <Input
                    id="from-name"
                    value={emailSettings.fromName}
                    onChange={(e) => setEmailSettings({...emailSettings, fromName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="reply-to">Reply-To Email</Label>
                  <Input
                    id="reply-to"
                    type="email"
                    value={emailSettings.replyToEmail}
                    onChange={(e) => setEmailSettings({...emailSettings, replyToEmail: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('email')} disabled={saving}>
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Settings */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>Manage API keys and rate limits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    API keys provide full access to your platform's data. Keep them secure and rotate regularly.
                  </AlertDescription>
                </Alert>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium">Active API Keys</h3>
                    <Button size="sm">
                      <Key className="h-4 w-4 mr-2" />
                      Generate New Key
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-mono text-sm">sk_live_••••••••••••••••</p>
                        <p className="text-xs text-gray-500">Created on Jan 1, 2024</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-700">Active</Badge>
                        <Button variant="ghost" size="sm">Revoke</Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-mono text-sm">sk_test_••••••••••••••••</p>
                        <p className="text-xs text-gray-500">Created on Dec 15, 2023</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-100 text-yellow-700">Test</Badge>
                        <Button variant="ghost" size="sm">Revoke</Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-4">Webhooks</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">https://example.com/webhook</p>
                        <p className="text-xs text-gray-500">user.created, payment.success</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Button variant="ghost" size="sm">Edit</Button>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-2">
                    Add Webhook
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}