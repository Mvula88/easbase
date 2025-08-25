'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Globe,
  Plus,
  Check,
  X,
  AlertCircle,
  Loader2,
  Shield,
  Zap,
  Copy,
  ExternalLink,
  RefreshCw,
  Settings,
} from 'lucide-react';

interface Domain {
  id: string;
  domain: string;
  status: 'pending' | 'active' | 'failed';
  ssl_status: 'pending' | 'active' | 'none';
  project_id: string;
  project_name: string;
  created_at: string;
  dns_configured: boolean;
  verification_token?: string;
}

export function DomainManager({ projectId }: { projectId: string }) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [showDNS, setShowDNS] = useState<string | null>(null);

  const addDomain = async () => {
    if (!newDomain) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: newDomain,
          project_id: projectId,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setDomains([...domains, data.domain]);
        setNewDomain('');
        setShowDNS(data.domain.id);
      }
    } catch (error) {
      console.error('Failed to add domain:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyDomain = async (domainId: string) => {
    setVerifying(domainId);
    try {
      const response = await fetch(`/api/domains/${domainId}/verify`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.verified) {
        setDomains(domains.map(d => 
          d.id === domainId 
            ? { ...d, status: 'active', dns_configured: true }
            : d
        ));
      }
    } catch (error) {
      console.error('Failed to verify domain:', error);
    } finally {
      setVerifying(null);
    }
  };

  const removeDomain = async (domainId: string) => {
    try {
      await fetch(`/api/domains/${domainId}`, {
        method: 'DELETE',
      });
      
      setDomains(domains.filter(d => d.id !== domainId));
    } catch (error) {
      console.error('Failed to remove domain:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Mock DNS records for display
  const getDNSRecords = (domain: Domain) => ({
    a_record: {
      type: 'A',
      name: '@',
      value: '76.76.21.21',
      ttl: 'Auto',
    },
    cname_record: {
      type: 'CNAME',
      name: 'www',
      value: `${domain.project_id}.easbase.io`,
      ttl: 'Auto',
    },
    txt_record: {
      type: 'TXT',
      name: '_easbase',
      value: domain.verification_token || `easbase-verify-${domain.id}`,
      ttl: 'Auto',
    },
  });

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Custom Domains
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Pro Feature
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Domain Form */}
          <div className="flex gap-2">
            <Input
              placeholder="example.com or app.example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addDomain} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Domain
                </>
              )}
            </Button>
          </div>

          {/* Domain List */}
          <div className="space-y-4">
            {domains.map((domain) => (
              <Card key={domain.id} className="relative">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{domain.domain}</h3>
                        <Badge
                          variant={domain.status === 'active' ? 'default' : 'secondary'}
                        >
                          {domain.status === 'active' ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Pending Setup
                            </>
                          )}
                        </Badge>
                        {domain.ssl_status === 'active' && (
                          <Badge variant="outline" className="text-green-600">
                            <Shield className="w-3 h-3 mr-1" />
                            SSL Active
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://${domain.domain}`, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-2" />
                          Visit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDNS(showDNS === domain.id ? null : domain.id)}
                        >
                          <Settings className="w-3 h-3 mr-2" />
                          DNS Settings
                        </Button>
                        {domain.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => verifyDomain(domain.id)}
                            disabled={verifying === domain.id}
                          >
                            {verifying === domain.id ? (
                              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3 mr-2" />
                            )}
                            Verify DNS
                          </Button>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDomain(domain.id)}
                      className="text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* DNS Configuration */}
                  {showDNS === domain.id && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        DNS Configuration
                      </h4>
                      
                      {domain.status === 'pending' && (
                        <Alert className="mb-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Add these DNS records to your domain provider to complete setup.
                            DNS changes may take up to 48 hours to propagate.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-3">
                        {Object.entries(getDNSRecords(domain)).map(([key, record]) => (
                          <div key={key} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <Label className="text-xs text-gray-500">Type</Label>
                                <p className="font-mono font-semibold">{record.type}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Name</Label>
                                <p className="font-mono">{record.name}</p>
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs text-gray-500">Value</Label>
                                <div className="flex items-center gap-2">
                                  <p className="font-mono text-xs truncate flex-1">
                                    {record.value}
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(record.value)}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <h5 className="font-semibold text-sm mb-2">Next Steps:</h5>
                        <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>1. Log in to your domain registrar (GoDaddy, Namecheap, etc.)</li>
                          <li>2. Navigate to DNS settings for {domain.domain}</li>
                          <li>3. Add the records shown above</li>
                          <li>4. Click "Verify DNS" to check configuration</li>
                          <li>5. SSL certificate will be provisioned automatically</li>
                        </ol>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {domains.length === 0 && (
            <div className="text-center py-12">
              <Globe className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No custom domains yet</h3>
              <p className="text-gray-600 mb-4">
                Add a custom domain to give your backend a professional URL
              </p>
              <p className="text-sm text-gray-500">
                Example: api.yourdomain.com or backend.yourdomain.com
              </p>
            </div>
          )}

          {/* Features */}
          <div className="border-t pt-6">
            <h4 className="font-semibold mb-4">Included with Custom Domains:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Shield className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm">Free SSL</p>
              </div>
              <div className="text-center">
                <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                <p className="text-sm">Auto-renewal</p>
              </div>
              <div className="text-center">
                <Globe className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <p className="text-sm">Global CDN</p>
              </div>
              <div className="text-center">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <p className="text-sm">Zero downtime</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}