'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/auth/supabase-client';
import {
  Plus,
  Database,
  Settings,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  Clock,
  Activity,
  Code,
  Key,
  MoreVertical,
  Rocket
} from 'lucide-react';

interface Project {
  id: string;
  project_name: string;
  business_type: string;
  status: string;
  api_key: string;
  created_at: string;
  features: {
    auth: boolean;
    database: boolean;
    storage: boolean;
    email: boolean;
    payments: boolean;
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('customer_projects')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = (key: string, projectId: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(projectId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-700';
      case 'provisioning':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Backends</h1>
          <p className="text-gray-600 mt-2">Manage your backend projects and API keys</p>
        </div>
        <Link href="/dashboard/create-project">
          <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create New Backend
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No backends yet</h3>
            <p className="text-gray-600 mb-6">Create your first backend to get started</p>
            <Link href="/dashboard/create-project">
              <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white">
                <Rocket className="w-4 h-4 mr-2" />
                Create Your First Backend
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{project.project_name}</CardTitle>
                    <CardDescription className="mt-1">
                      {project.business_type || 'Custom Backend'}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">API Key</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                        {project.api_key.substring(0, 20)}...
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyApiKey(project.api_key, project.id)}
                      >
                        {copiedKey === project.id ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">Features</p>
                    <div className="flex flex-wrap gap-1">
                      {project.features.auth && <Badge variant="outline" className="text-xs">Auth</Badge>}
                      {project.features.database && <Badge variant="outline" className="text-xs">Database</Badge>}
                      {project.features.storage && <Badge variant="outline" className="text-xs">Storage</Badge>}
                      {project.features.email && <Badge variant="outline" className="text-xs">Email</Badge>}
                      {project.features.payments && <Badge variant="outline" className="text-xs">Payments</Badge>}
                    </div>
                  </div>

                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="w-3 h-3 mr-1" />
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Manage
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteProject(project.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}