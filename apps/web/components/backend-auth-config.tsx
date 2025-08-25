'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Shield, FileText, Loader2 } from 'lucide-react';

interface BackendAuthConfigProps {
  backendId: string;
}

export function BackendAuthConfig({ backendId }: BackendAuthConfigProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // OAuth Provider Configuration
  const [oauthConfig, setOauthConfig] = useState({
    provider: 'google',
    enabled: false,
    clientId: '',
    clientSecret: '',
  });

  // SMTP Configuration
  const [smtpConfig, setSmtpConfig] = useState({
    provider: 'resend',
    apiKey: '',
    fromEmail: '',
    fromName: '',
    // Custom SMTP fields
    host: '',
    port: 587,
    username: '',
    password: '',
  });

  // Email Template Configuration
  const [templateConfig, setTemplateConfig] = useState({
    templateType: 'confirmation',
    subject: '',
    content: '',
    redirectTo: '',
  });

  const configureOAuth = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/backends/${backendId}/auth-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'oauth',
          config: oauthConfig,
        }),
      });

      if (!response.ok) throw new Error('Failed to configure OAuth');
      
      const data = await response.json();
      toast({
        title: 'OAuth Configured',
        description: `${oauthConfig.provider} authentication ${oauthConfig.enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to configure OAuth provider',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const configureSMTP = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/backends/${backendId}/auth-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'smtp',
          config: smtpConfig,
        }),
      });

      if (!response.ok) throw new Error('Failed to configure SMTP');
      
      toast({
        title: 'SMTP Configured',
        description: `Email will be sent via ${smtpConfig.provider}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to configure SMTP',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const configureTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/backends/${backendId}/auth-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email-templates',
          config: templateConfig,
        }),
      });

      if (!response.ok) throw new Error('Failed to configure template');
      
      toast({
        title: 'Template Updated',
        description: `${templateConfig.templateType} email template saved`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update email template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authentication Configuration</CardTitle>
        <CardDescription>
          Configure OAuth providers, custom email, and authentication settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="oauth">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="oauth">
              <Shield className="w-4 h-4 mr-2" />
              OAuth
            </TabsTrigger>
            <TabsTrigger value="smtp">
              <Mail className="w-4 h-4 mr-2" />
              Email/SMTP
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
          </TabsList>

          {/* OAuth Configuration */}
          <TabsContent value="oauth" className="space-y-4">
            <div>
              <Label>Provider</Label>
              <select
                className="w-full p-2 border rounded"
                value={oauthConfig.provider}
                onChange={(e) => setOauthConfig({ ...oauthConfig, provider: e.target.value })}
              >
                <option value="google">Google</option>
                <option value="github">GitHub</option>
                <option value="facebook">Facebook</option>
                <option value="twitter">Twitter</option>
                <option value="discord">Discord</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={oauthConfig.enabled}
                onCheckedChange={(checked) => setOauthConfig({ ...oauthConfig, enabled: checked })}
              />
              <Label>Enable {oauthConfig.provider} authentication</Label>
            </div>

            <div>
              <Label>Client ID</Label>
              <Input
                placeholder={`Your ${oauthConfig.provider} OAuth client ID`}
                value={oauthConfig.clientId}
                onChange={(e) => setOauthConfig({ ...oauthConfig, clientId: e.target.value })}
              />
            </div>

            <div>
              <Label>Client Secret</Label>
              <Input
                type="password"
                placeholder={`Your ${oauthConfig.provider} OAuth client secret`}
                value={oauthConfig.clientSecret}
                onChange={(e) => setOauthConfig({ ...oauthConfig, clientSecret: e.target.value })}
              />
            </div>

            <Button onClick={configureOAuth} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save OAuth Configuration
            </Button>
          </TabsContent>

          {/* SMTP Configuration */}
          <TabsContent value="smtp" className="space-y-4">
            <div>
              <Label>Email Provider</Label>
              <select
                className="w-full p-2 border rounded"
                value={smtpConfig.provider}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, provider: e.target.value })}
              >
                <option value="resend">Resend</option>
                <option value="sendgrid">SendGrid</option>
                <option value="mailgun">Mailgun</option>
                <option value="custom">Custom SMTP</option>
              </select>
            </div>

            {smtpConfig.provider !== 'custom' ? (
              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder={`Your ${smtpConfig.provider} API key`}
                  value={smtpConfig.apiKey}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, apiKey: e.target.value })}
                />
              </div>
            ) : (
              <>
                <div>
                  <Label>SMTP Host</Label>
                  <Input
                    placeholder="smtp.example.com"
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Port</Label>
                  <Input
                    type="number"
                    placeholder="587"
                    value={smtpConfig.port}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Username</Label>
                  <Input
                    placeholder="SMTP username"
                    value={smtpConfig.username}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="SMTP password"
                    value={smtpConfig.password}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                  />
                </div>
              </>
            )}

            <div>
              <Label>From Email</Label>
              <Input
                type="email"
                placeholder="noreply@yourdomain.com"
                value={smtpConfig.fromEmail}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
              />
            </div>

            <div>
              <Label>From Name</Label>
              <Input
                placeholder="Your App Name"
                value={smtpConfig.fromName}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
              />
            </div>

            <Button onClick={configureSMTP} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Email Configuration
            </Button>
          </TabsContent>

          {/* Email Templates */}
          <TabsContent value="templates" className="space-y-4">
            <div>
              <Label>Template Type</Label>
              <select
                className="w-full p-2 border rounded"
                value={templateConfig.templateType}
                onChange={(e) => setTemplateConfig({ ...templateConfig, templateType: e.target.value })}
              >
                <option value="confirmation">Email Confirmation</option>
                <option value="recovery">Password Recovery</option>
                <option value="invite">User Invitation</option>
                <option value="magic_link">Magic Link</option>
              </select>
            </div>

            <div>
              <Label>Email Subject</Label>
              <Input
                placeholder="Welcome to our app!"
                value={templateConfig.subject}
                onChange={(e) => setTemplateConfig({ ...templateConfig, subject: e.target.value })}
              />
            </div>

            <div>
              <Label>Email Content (HTML)</Label>
              <textarea
                className="w-full p-2 border rounded h-32"
                placeholder="<h1>Welcome!</h1><p>Click {{ .ConfirmationURL }} to confirm your email.</p>"
                value={templateConfig.content}
                onChange={(e) => setTemplateConfig({ ...templateConfig, content: e.target.value })}
              />
            </div>

            <div>
              <Label>Redirect URL</Label>
              <Input
                placeholder="https://yourapp.com/welcome"
                value={templateConfig.redirectTo}
                onChange={(e) => setTemplateConfig({ ...templateConfig, redirectTo: e.target.value })}
              />
            </div>

            <Button onClick={configureTemplate} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Template
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}