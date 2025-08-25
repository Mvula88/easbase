'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Database,
  Shield,
  Code,
  Settings,
  Plus,
  Trash2,
  Save,
  Wand2,
  Key,
  Globe,
  Mail,
  Bell,
  Lock,
  Users,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface BackendConfig {
  database: {
    tables: Array<{
      name: string;
      columns: Array<{
        name: string;
        type: string;
        nullable: boolean;
      }>;
      rls: boolean;
    }>;
  };
  auth: {
    providers: string[];
    requireEmailVerification: boolean;
    allowSignups: boolean;
    sessionLength: number;
  };
  api: {
    rateLimiting: boolean;
    corsOrigins: string[];
    webhooks: Array<{
      url: string;
      events: string[];
    }>;
  };
  features: {
    realtime: boolean;
    storage: boolean;
    edge: boolean;
    vectorSearch: boolean;
  };
}

export function CustomizationPanel({ 
  initialConfig,
  onSave 
}: { 
  initialConfig?: BackendConfig;
  onSave: (config: BackendConfig) => void;
}) {
  const [config, setConfig] = useState<BackendConfig>(initialConfig || {
    database: { tables: [] },
    auth: {
      providers: ['email'],
      requireEmailVerification: false,
      allowSignups: true,
      sessionLength: 24,
    },
    api: {
      rateLimiting: true,
      corsOrigins: ['http://localhost:3000'],
      webhooks: [],
    },
    features: {
      realtime: true,
      storage: false,
      edge: false,
      vectorSearch: false,
    },
  });

  const [expandedTables, setExpandedTables] = useState<Set<number>>(new Set());

  const toggleTableExpansion = (index: number) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedTables(newExpanded);
  };

  const addTable = () => {
    setConfig({
      ...config,
      database: {
        ...config.database,
        tables: [
          ...config.database.tables,
          {
            name: `table_${config.database.tables.length + 1}`,
            columns: [
              { name: 'id', type: 'uuid', nullable: false },
              { name: 'created_at', type: 'timestamptz', nullable: false },
            ],
            rls: true,
          },
        ],
      },
    });
  };

  const addColumn = (tableIndex: number) => {
    const newTables = [...config.database.tables];
    newTables[tableIndex].columns.push({
      name: `column_${newTables[tableIndex].columns.length + 1}`,
      type: 'text',
      nullable: true,
    });
    setConfig({
      ...config,
      database: { ...config.database, tables: newTables },
    });
  };

  const updateTable = (index: number, field: string, value: any) => {
    const newTables = [...config.database.tables];
    newTables[index] = { ...newTables[index], [field]: value };
    setConfig({
      ...config,
      database: { ...config.database, tables: newTables },
    });
  };

  const updateColumn = (tableIndex: number, columnIndex: number, field: string, value: any) => {
    const newTables = [...config.database.tables];
    newTables[tableIndex].columns[columnIndex] = {
      ...newTables[tableIndex].columns[columnIndex],
      [field]: value,
    };
    setConfig({
      ...config,
      database: { ...config.database, tables: newTables },
    });
  };

  const deleteTable = (index: number) => {
    const newTables = config.database.tables.filter((_, i) => i !== index);
    setConfig({
      ...config,
      database: { ...config.database, tables: newTables },
    });
  };

  const deleteColumn = (tableIndex: number, columnIndex: number) => {
    const newTables = [...config.database.tables];
    newTables[tableIndex].columns = newTables[tableIndex].columns.filter((_, i) => i !== columnIndex);
    setConfig({
      ...config,
      database: { ...config.database, tables: newTables },
    });
  };

  const toggleAuthProvider = (provider: string) => {
    const providers = config.auth.providers.includes(provider)
      ? config.auth.providers.filter(p => p !== provider)
      : [...config.auth.providers, provider];
    setConfig({
      ...config,
      auth: { ...config.auth, providers },
    });
  };

  const addWebhook = () => {
    setConfig({
      ...config,
      api: {
        ...config.api,
        webhooks: [
          ...config.api.webhooks,
          { url: '', events: [] },
        ],
      },
    });
  };

  const updateWebhook = (index: number, field: string, value: any) => {
    const newWebhooks = [...config.api.webhooks];
    newWebhooks[index] = { ...newWebhooks[index], [field]: value };
    setConfig({
      ...config,
      api: { ...config.api, webhooks: newWebhooks },
    });
  };

  const deleteWebhook = (index: number) => {
    const newWebhooks = config.api.webhooks.filter((_, i) => i !== index);
    setConfig({
      ...config,
      api: { ...config.api, webhooks: newWebhooks },
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-purple-600" />
            Customize Your Backend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="database" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="database">
                <Database className="w-4 h-4 mr-2" />
                Database
              </TabsTrigger>
              <TabsTrigger value="auth">
                <Shield className="w-4 h-4 mr-2" />
                Auth
              </TabsTrigger>
              <TabsTrigger value="api">
                <Code className="w-4 h-4 mr-2" />
                API
              </TabsTrigger>
              <TabsTrigger value="features">
                <Settings className="w-4 h-4 mr-2" />
                Features
              </TabsTrigger>
            </TabsList>

            {/* Database Tab */}
            <TabsContent value="database" className="mt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Database Tables</h3>
                  <Button onClick={addTable} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Table
                  </Button>
                </div>

                {config.database.tables.map((table, tableIndex) => (
                  <Card key={tableIndex} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTableExpansion(tableIndex)}
                          >
                            {expandedTables.has(tableIndex) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                          <Input
                            value={table.name}
                            onChange={(e) => updateTable(tableIndex, 'name', e.target.value)}
                            className="max-w-xs"
                            placeholder="Table name"
                          />
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={table.rls}
                              onCheckedChange={(checked) => updateTable(tableIndex, 'rls', checked)}
                            />
                            <Label className="text-sm">RLS</Label>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTable(tableIndex)}
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    {expandedTables.has(tableIndex) && (
                      <CardContent>
                        <div className="space-y-2">
                          {table.columns.map((column, columnIndex) => (
                            <div key={columnIndex} className="flex items-center gap-2">
                              <Input
                                value={column.name}
                                onChange={(e) => updateColumn(tableIndex, columnIndex, 'name', e.target.value)}
                                placeholder="Column name"
                                className="flex-1"
                              />
                              <Select
                                value={column.type}
                                onValueChange={(value) => updateColumn(tableIndex, columnIndex, 'type', value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="integer">Integer</SelectItem>
                                  <SelectItem value="uuid">UUID</SelectItem>
                                  <SelectItem value="boolean">Boolean</SelectItem>
                                  <SelectItem value="timestamptz">Timestamp</SelectItem>
                                  <SelectItem value="jsonb">JSONB</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={!column.nullable}
                                  onCheckedChange={(checked) => updateColumn(tableIndex, columnIndex, 'nullable', !checked)}
                                />
                                <Label className="text-sm">Required</Label>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteColumn(tableIndex, columnIndex)}
                                className="text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addColumn(tableIndex)}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Column
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Auth Tab */}
            <TabsContent value="auth" className="mt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Authentication Providers</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {['email', 'google', 'github', 'twitter', 'facebook', 'apple'].map((provider) => (
                      <div key={provider} className="flex items-center gap-2">
                        <Switch
                          checked={config.auth.providers.includes(provider)}
                          onCheckedChange={() => toggleAuthProvider(provider)}
                        />
                        <Label className="capitalize">{provider}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.auth.requireEmailVerification}
                      onCheckedChange={(checked) => setConfig({
                        ...config,
                        auth: { ...config.auth, requireEmailVerification: checked },
                      })}
                    />
                    <Label>Require Email Verification</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.auth.allowSignups}
                      onCheckedChange={(checked) => setConfig({
                        ...config,
                        auth: { ...config.auth, allowSignups: checked },
                      })}
                    />
                    <Label>Allow New Sign-ups</Label>
                  </div>

                  <div>
                    <Label>Session Length (hours)</Label>
                    <Input
                      type="number"
                      value={config.auth.sessionLength}
                      onChange={(e) => setConfig({
                        ...config,
                        auth: { ...config.auth, sessionLength: parseInt(e.target.value) },
                      })}
                      className="max-w-xs mt-2"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* API Tab */}
            <TabsContent value="api" className="mt-6">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.api.rateLimiting}
                    onCheckedChange={(checked) => setConfig({
                      ...config,
                      api: { ...config.api, rateLimiting: checked },
                    })}
                  />
                  <Label>Enable Rate Limiting</Label>
                </div>

                <div>
                  <Label>CORS Origins</Label>
                  <Textarea
                    value={config.api.corsOrigins.join('\n')}
                    onChange={(e) => setConfig({
                      ...config,
                      api: { ...config.api, corsOrigins: e.target.value.split('\n').filter(Boolean) },
                    })}
                    placeholder="https://example.com"
                    className="mt-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Webhooks</h3>
                    <Button onClick={addWebhook} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Webhook
                    </Button>
                  </div>

                  {config.api.webhooks.map((webhook, index) => (
                    <Card key={index} className="mb-3">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <Input
                            value={webhook.url}
                            onChange={(e) => updateWebhook(index, 'url', e.target.value)}
                            placeholder="https://your-webhook-url.com"
                          />
                          <div className="flex justify-between">
                            <div className="flex gap-2 flex-wrap">
                              {['insert', 'update', 'delete'].map((event) => (
                                <div key={event} className="flex items-center gap-1">
                                  <Switch
                                    checked={webhook.events.includes(event)}
                                    onCheckedChange={(checked) => {
                                      const events = checked
                                        ? [...webhook.events, event]
                                        : webhook.events.filter(e => e !== event);
                                      updateWebhook(index, 'events', events);
                                    }}
                                  />
                                  <Label className="text-sm capitalize">{event}</Label>
                                </div>
                              ))}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteWebhook(index)}
                              className="text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Advanced Features</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <Switch
                      checked={config.features.realtime}
                      onCheckedChange={(checked) => setConfig({
                        ...config,
                        features: { ...config.features, realtime: checked },
                      })}
                    />
                    <div>
                      <Label>Real-time Subscriptions</Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Enable WebSocket connections for live data updates
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Switch
                      checked={config.features.storage}
                      onCheckedChange={(checked) => setConfig({
                        ...config,
                        features: { ...config.features, storage: checked },
                      })}
                    />
                    <div>
                      <Label>File Storage</Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Store and serve images, documents, and other files
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Switch
                      checked={config.features.edge}
                      onCheckedChange={(checked) => setConfig({
                        ...config,
                        features: { ...config.features, edge: checked },
                      })}
                    />
                    <div>
                      <Label>Edge Functions</Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Deploy serverless functions at the edge
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Switch
                      checked={config.features.vectorSearch}
                      onCheckedChange={(checked) => setConfig({
                        ...config,
                        features: { ...config.features, vectorSearch: checked },
                      })}
                    />
                    <div>
                      <Label>Vector Search</Label>
                      <p className="text-sm text-gray-500 mt-1">
                        AI-powered semantic search capabilities
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-8 flex justify-end gap-4">
            <Button variant="outline">Cancel</Button>
            <Button onClick={() => onSave(config)}>
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}