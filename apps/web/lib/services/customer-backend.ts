import { DatabaseProvisioningService } from './database-provisioning';
import { SupabaseProxyService } from './supabase-proxy';
import { createClient } from '@/lib/auth/supabase';

export interface CustomerBackend {
  id: string;
  customerId: string;
  projectId: string;
  name: string;
  status: 'active' | 'paused' | 'deleted';
  plan: 'free' | 'pro' | 'enterprise';
  endpoints: {
    api: string;
    auth: string;
    storage: string;
    realtime: string;
  };
  credentials: {
    anonKey: string;
    serviceRoleKey?: string; // Only for pro/enterprise plans
  };
  usage: {
    database: number; // MB
    storage: number; // MB
    bandwidth: number; // MB
    requests: number;
  };
  limits: {
    database: number;
    storage: number;
    bandwidth: number;
    requests: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class CustomerBackendService {
  private provisioning: DatabaseProvisioningService;
  private proxy: SupabaseProxyService;

  constructor() {
    this.provisioning = new DatabaseProvisioningService();
    this.proxy = new SupabaseProxyService();
  }

  /**
   * Create a new backend for a customer
   */
  async createBackend(
    customerId: string,
    customerEmail: string,
    options: {
      name: string;
      template: 'saas' | 'marketplace' | 'social' | 'enterprise';
      plan: 'free' | 'pro' | 'enterprise';
    }
  ): Promise<CustomerBackend> {
    try {
      // Step 1: Create Supabase project
      const project = await this.provisioning.createProject(
        customerId,
        customerEmail,
        options.plan
      );

      // Step 2: Wait for project to be ready
      await this.waitForProjectReady(project.id);

      // Step 3: Get project credentials
      const credentials = await this.provisioning.getProjectCredentials(project.id);

      // Step 4: Initialize with template
      await this.provisioning.initializeProjectSchema(project.id, options.template);

      // Step 5: Generate custom endpoints
      const endpoints = this.proxy.generateCustomerEndpoints(project.id, customerId);

      // Step 6: Store in our database
      const backend = await this.storeBackendInfo({
        customerId,
        projectId: project.id,
        name: options.name,
        plan: options.plan,
        endpoints,
        credentials: {
          anonKey: credentials.anon_key,
          serviceRoleKey: options.plan !== 'free' ? credentials.service_role_key : undefined,
        },
      });

      // Step 7: Set up custom domain routing (if pro/enterprise)
      if (options.plan !== 'free') {
        await this.setupCustomDomain(backend);
      }

      return backend;
    } catch (error) {
      console.error('Failed to create customer backend:', error);
      throw new Error('Failed to create backend. Please try again.');
    }
  }

  /**
   * Get all backends for a customer
   */
  async getCustomerBackends(customerId: string): Promise<CustomerBackend[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('customer_backends')
      .select('*')
      .eq('customer_id', customerId)
      .neq('status', 'deleted');

    if (error) {
      console.error('Failed to fetch customer backends:', error);
      throw error;
    }

    return data.map(this.mapToCustomerBackend);
  }

  /**
   * Get backend details
   */
  async getBackend(backendId: string, customerId: string): Promise<CustomerBackend | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('customer_backends')
      .select('*')
      .eq('id', backendId)
      .eq('customer_id', customerId)
      .single();

    if (error) {
      console.error('Failed to fetch backend:', error);
      return null;
    }

    return this.mapToCustomerBackend(data);
  }

  /**
   * Update backend plan
   */
  async upgradeBackend(
    backendId: string,
    customerId: string,
    newPlan: 'pro' | 'enterprise'
  ): Promise<CustomerBackend> {
    const backend = await this.getBackend(backendId, customerId);
    if (!backend) {
      throw new Error('Backend not found');
    }

    // Update in Supabase (would involve billing changes)
    // This is simplified - real implementation would handle billing

    // Update in our database
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('customer_backends')
      .update({
        plan: newPlan,
        limits: this.getPlanLimits(newPlan),
        updated_at: new Date().toISOString(),
      })
      .eq('id', backendId)
      .eq('customer_id', customerId)
      .single();

    if (error) throw error;

    // Set up custom domain for upgraded plans (pro and enterprise always get custom domains)
    await this.setupCustomDomain(this.mapToCustomerBackend(data));

    return this.mapToCustomerBackend(data);
  }

  /**
   * Pause a backend (suspend but keep data)
   */
  async pauseBackend(backendId: string, customerId: string): Promise<void> {
    const backend = await this.getBackend(backendId, customerId);
    if (!backend) {
      throw new Error('Backend not found');
    }

    await this.provisioning.pauseProject(backend.projectId);

    const supabase = await createClient();
    await supabase
      .from('customer_backends')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString(),
      })
      .eq('id', backendId)
      .eq('customer_id', customerId);
  }

  /**
   * Resume a paused backend
   */
  async resumeBackend(backendId: string, customerId: string): Promise<void> {
    const backend = await this.getBackend(backendId, customerId);
    if (!backend) {
      throw new Error('Backend not found');
    }

    await this.provisioning.resumeProject(backend.projectId);

    const supabase = await createClient();
    await supabase
      .from('customer_backends')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', backendId)
      .eq('customer_id', customerId);
  }

  /**
   * Delete a backend (permanent)
   */
  async deleteBackend(backendId: string, customerId: string): Promise<void> {
    const backend = await this.getBackend(backendId, customerId);
    if (!backend) {
      throw new Error('Backend not found');
    }

    await this.provisioning.deleteProject(backend.projectId);

    const supabase = await createClient();
    await supabase
      .from('customer_backends')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', backendId)
      .eq('customer_id', customerId);
  }

  /**
   * Get backend usage statistics
   */
  async getBackendUsage(backendId: string, customerId: string): Promise<{
    database: number;
    storage: number;
    bandwidth: number;
    requests: number;
    percentage: {
      database: number;
      storage: number;
      bandwidth: number;
      requests: number;
    };
  }> {
    const backend = await this.getBackend(backendId, customerId);
    if (!backend) {
      throw new Error('Backend not found');
    }

    // In real implementation, this would fetch from Supabase metrics API
    // For now, return mock data
    const usage = backend.usage;
    const limits = backend.limits;

    return {
      ...usage,
      percentage: {
        database: (usage.database / limits.database) * 100,
        storage: (usage.storage / limits.storage) * 100,
        bandwidth: (usage.bandwidth / limits.bandwidth) * 100,
        requests: (usage.requests / limits.requests) * 100,
      },
    };
  }

  /**
   * Generate API documentation for customer
   */
  async generateApiDocs(backendId: string, customerId: string): Promise<string> {
    const backend = await this.getBackend(backendId, customerId);
    if (!backend) {
      throw new Error('Backend not found');
    }

    return `
# ${backend.name} API Documentation

## Base URLs
- **API**: ${backend.endpoints.api}
- **Auth**: ${backend.endpoints.auth}
- **Storage**: ${backend.endpoints.storage}
- **Realtime**: ${backend.endpoints.realtime}

## Authentication
All requests must include the API key in the header:
\`\`\`
apikey: ${backend.credentials.anonKey}
Authorization: Bearer ${backend.credentials.anonKey}
\`\`\`

## Quick Start

### JavaScript/TypeScript
\`\`\`javascript
import { createClient } from '@easbase/client-js'

const easbase = createClient('${backend.endpoints.api}', '${backend.credentials.anonKey}')
\`\`\`

### cURL
\`\`\`bash
curl '${backend.endpoints.api}/your-table' \\
  -H "apikey: ${backend.credentials.anonKey}" \\
  -H "Authorization: Bearer ${backend.credentials.anonKey}"
\`\`\`

## Rate Limits
- **Free**: 1,000 requests/hour
- **Pro**: 10,000 requests/hour
- **Enterprise**: Unlimited

## Support
For support, contact support@easbase.io
    `;
  }

  /**
   * Wait for project to be ready
   */
  private async waitForProjectReady(projectId: string, maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.provisioning.getProjectStatus(projectId);
      if (status.status === 'ACTIVE_HEALTHY') {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    }
    throw new Error('Project provisioning timeout');
  }

  /**
   * Store backend info in our database
   */
  private async storeBackendInfo(data: any): Promise<CustomerBackend> {
    const supabase = await createClient();
    
    const { data: backend, error } = await supabase
      .from('customer_backends')
      .insert({
        customer_id: data.customerId,
        project_id: data.projectId,
        name: data.name,
        status: 'active',
        plan: data.plan,
        endpoints: data.endpoints,
        credentials: data.credentials,
        usage: {
          database: 0,
          storage: 0,
          bandwidth: 0,
          requests: 0,
        },
        limits: this.getPlanLimits(data.plan),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .single();

    if (error) throw error;

    return this.mapToCustomerBackend(backend);
  }

  /**
   * Set up custom domain routing
   */
  private async setupCustomDomain(backend: CustomerBackend): Promise<void> {
    // This would integrate with your DNS provider (e.g., Cloudflare)
    // to set up CNAME records for the custom subdomain
    console.log(`Setting up custom domain for backend ${backend.id}`);
    // Implementation depends on your DNS provider
  }

  /**
   * Get plan limits
   */
  private getPlanLimits(plan: string): any {
    const limits = {
      free: {
        database: 500, // MB
        storage: 1024, // MB
        bandwidth: 2048, // MB
        requests: 50000,
      },
      pro: {
        database: 8192,
        storage: 10240,
        bandwidth: 51200,
        requests: 1000000,
      },
      enterprise: {
        database: -1, // Unlimited
        storage: -1,
        bandwidth: -1,
        requests: -1,
      },
    };

    return limits[plan as keyof typeof limits] || limits.free;
  }

  /**
   * Map database record to CustomerBackend type
   */
  private mapToCustomerBackend(data: any): CustomerBackend {
    return {
      id: data.id,
      customerId: data.customer_id,
      projectId: data.project_id,
      name: data.name,
      status: data.status,
      plan: data.plan,
      endpoints: data.endpoints,
      credentials: data.credentials,
      usage: data.usage,
      limits: data.limits,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}