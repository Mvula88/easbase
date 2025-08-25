import { getEnv } from '@/lib/config/env';
import { createClient } from '@/lib/auth/supabase';

export interface DatabaseProject {
  id: string;
  organization_id: string;
  name: string;
  region: string;
  created_at: string;
  database: {
    host: string;
    version: string;
  };
  status: 'ACTIVE_HEALTHY' | 'COMING_UP' | 'INACTIVE';
}

export interface ProjectCredentials {
  url: string;
  anon_key: string;
  service_role_key: string;
  jwt_secret: string;
  database_url: string;
}

export class DatabaseProvisioningService {
  private accessToken: string;
  private organizationId: string;
  private apiUrl: string;

  constructor() {
    // Try to get from getEnv first, fallback to process.env
    try {
      const env = getEnv();
      this.accessToken = env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN || '';
      this.organizationId = env.SUPABASE_ORGANIZATION_ID || process.env.SUPABASE_ORGANIZATION_ID || '';
      this.apiUrl = env.SUPABASE_MANAGEMENT_API_URL || process.env.SUPABASE_MANAGEMENT_API_URL || 'https://api.supabase.com';
    } catch (error) {
      // Fallback to process.env if getEnv fails
      this.accessToken = process.env.SUPABASE_ACCESS_TOKEN || '';
      this.organizationId = process.env.SUPABASE_ORGANIZATION_ID || '';
      this.apiUrl = process.env.SUPABASE_MANAGEMENT_API_URL || 'https://api.supabase.com';
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.apiUrl}${endpoint}`;
    console.log(`Making request to: ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `Database API error: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.text();
        errorMessage += ` - ${errorBody}`;
        console.error('API Error Response:', errorBody);
      } catch (e) {
        console.error('Could not parse error response');
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Create a new database project for a customer
   */
  async createProject(customerId: string, customerEmail: string, plan: 'free' | 'pro' | 'enterprise' = 'free'): Promise<DatabaseProject> {
    try {
      console.log('Creating Supabase project for:', { customerId, customerEmail, plan });
      console.log('Using organization:', this.organizationId);
      console.log('Access token present:', !!this.accessToken);
      
      const projectName = `easbase-${customerId.slice(0, 8)}`;
      
      const requestBody = {
        name: projectName,
        organization_id: this.organizationId,
        plan: plan === 'enterprise' ? 'pro' : plan, // Use 'pro' for enterprise customers
        region: 'us-east-1',
        db_pass: this.generateSecurePassword(),
        kps_enabled: true, // Enable connection pooling
      };
      
      console.log('Sending project creation request:', requestBody);
      
      const project = await this.makeRequest('/v1/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      // Store project info in our database
      await this.storeProjectInfo(customerId, project);

      console.log('Project created successfully:', project);
      return project;
    } catch (error: any) {
      console.error('Failed to create database project:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      });
      throw new Error(`Failed to provision database: ${error.message}`);
    }
  }

  /**
   * Get project API keys and credentials
   */
  async getProjectCredentials(projectId: string): Promise<ProjectCredentials> {
    try {
      const keys = await this.makeRequest(`/v1/projects/${projectId}/api-keys`);
      const settings = await this.makeRequest(`/v1/projects/${projectId}/settings`);

      return {
        url: `https://${projectId}.supabase.co`,
        anon_key: keys.anon_key,
        service_role_key: keys.service_role_key,
        jwt_secret: settings.jwt_secret,
        database_url: settings.db_connection_string,
      };
    } catch (error) {
      console.error('Failed to get project credentials:', error);
      throw new Error('Failed to retrieve project credentials');
    }
  }

  /**
   * Pause a project (for suspended accounts)
   */
  async pauseProject(projectId: string): Promise<void> {
    try {
      await this.makeRequest(`/v1/projects/${projectId}/pause`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to pause project:', error);
      throw error;
    }
  }

  /**
   * Resume a paused project
   */
  async resumeProject(projectId: string): Promise<void> {
    try {
      await this.makeRequest(`/v1/projects/${projectId}/resume`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to resume project:', error);
      throw error;
    }
  }

  /**
   * Delete a project (when customer cancels)
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      await this.makeRequest(`/v1/projects/${projectId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  }

  /**
   * Get project status and health
   */
  async getProjectStatus(projectId: string): Promise<DatabaseProject> {
    try {
      return await this.makeRequest(`/v1/projects/${projectId}`);
    } catch (error) {
      console.error('Failed to get project status:', error);
      throw error;
    }
  }

  /**
   * Initialize project with base schema
   */
  async initializeProjectSchema(projectId: string, template: 'saas' | 'marketplace' | 'social' | 'enterprise'): Promise<void> {
    try {
      const credentials = await this.getProjectCredentials(projectId);
      
      // Get template SQL based on type
      const templateSql = await this.getTemplateSql(template);
      
      // Execute SQL on the new project
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const supabase = createSupabaseClient(credentials.url, credentials.service_role_key);
      
      // Execute the template SQL
      const { error } = await supabase.rpc('exec_sql', {
        sql: templateSql
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to initialize project schema:', error);
      throw new Error('Failed to set up initial database schema');
    }
  }

  /**
   * Store project information in our master database
   */
  private async storeProjectInfo(customerId: string, project: DatabaseProject): Promise<void> {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('projects')
      .insert({
        customer_id: customerId,
        supabase_project_id: project.id,
        name: project.name,
        region: project.region,
        status: project.status,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to store project info:', error);
      throw error;
    }
  }

  /**
   * Generate a secure password for database
   */
  private generateSecurePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 32; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Get template SQL for different project types
   */
  private async getTemplateSql(template: string): Promise<string> {
    // This would load from your template library
    const templates: Record<string, string> = {
      saas: `
        -- SaaS Template Schema
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS memberships (
          user_id UUID REFERENCES users(id),
          organization_id UUID REFERENCES organizations(id),
          role TEXT NOT NULL,
          PRIMARY KEY (user_id, organization_id)
        );

        -- Enable RLS
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
      `,
      marketplace: `
        -- Marketplace Template Schema
        CREATE TABLE IF NOT EXISTS vendors (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          vendor_id UUID REFERENCES vendors(id),
          name TEXT NOT NULL,
          price DECIMAL(10,2),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          customer_email TEXT NOT NULL,
          total DECIMAL(10,2),
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Enable RLS
        ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
        ALTER TABLE products ENABLE ROW LEVEL SECURITY;
        ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
      `,
      social: `
        -- Social Network Template Schema
        CREATE TABLE IF NOT EXISTS profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username TEXT UNIQUE NOT NULL,
          bio TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          author_id UUID REFERENCES profiles(id),
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS follows (
          follower_id UUID REFERENCES profiles(id),
          following_id UUID REFERENCES profiles(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          PRIMARY KEY (follower_id, following_id)
        );

        -- Enable RLS
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
      `,
      enterprise: `
        -- Enterprise Template Schema
        CREATE TABLE IF NOT EXISTS departments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS employees (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          department_id UUID REFERENCES departments(id),
          email TEXT UNIQUE NOT NULL,
          role TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          department_id UUID REFERENCES departments(id),
          name TEXT NOT NULL,
          status TEXT DEFAULT 'planning',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Enable RLS
        ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
        ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
      `
    };

    return templates[template] || templates.saas;
  }

  /**
   * Check if provisioning is enabled (all required env vars present)
   */
  isProvisioningEnabled(): boolean {
    return !!(this.accessToken && this.organizationId);
  }

  /**
   * Estimate monthly cost for a customer's project
   */
  estimateProjectCost(plan: 'free' | 'pro' | 'enterprise'): number {
    const costs = {
      free: 0,
      pro: 25,
      enterprise: 599
    };
    return costs[plan] || 0;
  }
}