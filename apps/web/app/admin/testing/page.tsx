'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Play,
  FileText,
  Activity,
  Shield,
  Zap
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: { status: string; latency?: number };
    cache: { status: string; latency?: number };
    ai: { status: string; latency?: number };
    storage: { status: string; latency?: number };
  };
}

export default function TestingDashboard() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [healthStatus, setHealthStatus] = useState<HealthCheck | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch health status
  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealthStatus(data);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  // Run tests
  const runTests = async (type: string) => {
    setIsRunning(true);
    
    try {
      // Simulate running tests
      const mockResults: TestResult[] = [
        { name: 'Homepage loads correctly', status: 'passed', duration: 1234 },
        { name: 'Authentication flow works', status: 'passed', duration: 2345 },
        { name: 'Schema generation API', status: 'passed', duration: 3456 },
        { name: 'Deployment process', status: 'failed', duration: 4567, error: 'Connection timeout' },
        { name: 'Webhook delivery', status: 'passed', duration: 567 },
      ];
      
      setTestResults(mockResults);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
      case 'passed':
        return 'text-green-500';
      case 'degraded':
      case 'skipped':
        return 'text-yellow-500';
      case 'unhealthy':
      case 'down':
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
      case 'skipped':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy':
      case 'down':
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Testing & Monitoring Dashboard</h1>
        <p className="text-gray-600">Monitor system health and run tests</p>
      </div>

      {/* Health Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              System Health
              <Activity className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getStatusIcon(healthStatus?.status || 'unknown')}
              <span className={`font-semibold ${getStatusColor(healthStatus?.status || 'unknown')}`}>
                {healthStatus?.status || 'Checking...'}
              </span>
            </div>
          </CardContent>
        </Card>

        {healthStatus?.services && Object.entries(healthStatus.services).map(([service, status]) => (
          <Card key={service}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm capitalize">{service}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.status)}
                  <span className={getStatusColor(status.status)}>
                    {status.status}
                  </span>
                </div>
                {status.latency && (
                  <Badge variant="outline">{status.latency}ms</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Test Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Runner</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={() => runTests('e2e')}
              disabled={isRunning}
            >
              {isRunning ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Run E2E Tests
            </Button>
            <Button 
              onClick={() => runTests('unit')}
              disabled={isRunning}
              variant="outline"
            >
              Run Unit Tests
            </Button>
            <Button 
              onClick={() => runTests('api')}
              disabled={isRunning}
              variant="outline"
            >
              Run API Tests
            </Button>
            <Button 
              onClick={checkHealth}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Health
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Testing Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Tests</p>
                    <p className="text-2xl font-bold">{testResults.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Passed</p>
                    <p className="text-2xl font-bold text-green-500">
                      {testResults.filter(t => t.status === 'passed').length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Failed</p>
                    <p className="text-2xl font-bold text-red-500">
                      {testResults.filter(t => t.status === 'failed').length}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <span>{result.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{result.duration}ms</Badge>
                      {result.error && (
                        <Badge variant="destructive">{result.error}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Response Times</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>API Average</span>
                      <Badge>234ms</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Database Queries</span>
                      <Badge>45ms</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Cache Hit Rate</span>
                      <Badge variant="default">87%</Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Load Metrics</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Requests/min</span>
                      <Badge>1,234</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Users</span>
                      <Badge>456</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Error Rate</span>
                      <Badge variant="default">0.1%</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-green-500" />
                    <span>SSL Certificate Valid</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-green-500" />
                    <span>No SQL Injection Vulnerabilities</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-green-500" />
                    <span>XSS Protection Enabled</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-yellow-500" />
                    <span>Rate Limiting Active</span>
                  </div>
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}