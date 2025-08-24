import { createServiceClient } from '@/lib/auth/supabase';
import crypto from 'crypto';

interface SupabaseProject {
  id: string;
  organizationId: string;
  name: string;
  region: string;
  createdAt: string;
  databaseUrl: string;
  status: string;
  databaseHost: string;
  databasePassword: string;
  jwtSecret: string;
  anonKey: string;
  serviceRoleKey: string;
}

export class SupabaseProjectProvisioning {
  private accessToken: string;
  private organizationId: string;
  private managementApiUrl: string;

  constructor() {
    this.accessToken = process.env.SUPABASE_ACCESS_TOKEN!;
    this.organizationId = process.env.SUPABASE_ORGANIZATION_ID!;
    this.managementApiUrl = process.env.SUPABASE_MANAGEMENT_API_URL || 'https://api.supabase.com';
  }

  /**
   * Create a new Supabase project for a customer
   */
  async provisionProject(
    customerId: string,
    projectName: string,
    plan: 'starter' | 'professional' | 'business' | 'enterprise'
  ): Promise<SupabaseProject> {
    try {
      // Generate a unique project name
      const uniqueName = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
      
      // Create project via Supabase Management API
      const response = await fetch(`${this.managementApiUrl}/v1/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: this.organizationId,
          name: uniqueName,
          region: this.getRegionForPlan(plan),
          plan: 'free', // Start with free, upgrade via billing
          db_pass: this.generateSecurePassword(),
          kps_enabled: true, // Enable connection pooling
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create Supabase project: ${error}`);
      }

      const project = await response.json();

      // Wait for project to be ready
      await this.waitForProjectReady(project.id);

      // Get project details including keys
      const projectDetails = await this.getProjectDetails(project.id);

      // Store in our database
      await this.storeProjectMapping(customerId, projectDetails);

      return projectDetails;
    } catch (error) {
      console.error('Error provisioning Supabase project:', error);
      throw error;
    }
  }

  /**
   * Wait for project to be fully provisioned
   */
  private async waitForProjectReady(projectId: string, maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`${this.managementApiUrl}/v1/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (response.ok) {
        const project = await response.json();
        if (project.status === 'ACTIVE_HEALTHY') {
          return;
        }
      }

      // Wait 10 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    throw new Error('Project provisioning timeout');
  }

  /**
   * Get full project details including keys
   */
  private async getProjectDetails(projectId: string): Promise<SupabaseProject> {
    const response = await fetch(`${this.managementApiUrl}/v1/projects/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get project details');
    }

    const project = await response.json();

    // Get API keys
    const keysResponse = await fetch(`${this.managementApiUrl}/v1/projects/${projectId}/api-keys`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    const keys = await keysResponse.json();

    return {
      id: project.id,
      organizationId: project.organization_id,
      name: project.name,
      region: project.region,
      createdAt: project.created_at,
      databaseUrl: `postgresql://postgres.${project.id}:${project.db_pass}@${project.db_host}:5432/postgres`,
      status: project.status,
      databaseHost: project.db_host,
      databasePassword: project.db_pass,
      jwtSecret: project.jwt_secret,
      anonKey: keys.find((k: any) => k.name === 'anon')?.api_key,
      serviceRoleKey: keys.find((k: any) => k.name === 'service_role')?.api_key,
    };
  }

  /**
   * Store project mapping in our database
   */
  private async storeProjectMapping(customerId: string, project: SupabaseProject): Promise<void> {
    const supabase = await createServiceClient();
    
    // Encrypt sensitive keys
    const encryptedServiceKey = this.encryptData(project.serviceRoleKey);
    const encryptedDbPassword = this.encryptData(project.databasePassword);

    await supabase
      .from('customer_projects')
      .update({
        supabase_project_id: project.id,
        supabase_url: `https://${project.id}.supabase.co`,
        supabase_anon_key: project.anonKey,
        supabase_service_key_encrypted: encryptedServiceKey,
        metadata: {
          region: project.region,
          database_host: project.databaseHost,
          database_password_encrypted: encryptedDbPassword,
          provisioned_at: new Date().toISOString(),
        },
        status: 'active',
      })
      .eq('customer_id', customerId);
  }

  /**
   * Deploy schema to customer's Supabase project
   */
  async deploySchemaToProject(
    projectId: string,
    sql: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get project credentials from our database
      const supabase = await createServiceClient();
      const { data: project } = await supabase
        .from('customer_projects')
        .select('*')
        .eq('supabase_project_id', projectId)
        .single();

      if (!project) {
        throw new Error('Project not found');
      }

      // Decrypt service key
      const serviceKey = this.decryptData(project.supabase_service_key_encrypted);

      // Create client for customer's Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const customerSupabase = createClient(
        project.supabase_url,
        serviceKey
      );

      // Execute SQL
      const { error } = await customerSupabase.rpc('exec_sql', { sql });

      if (error) {
        return { success: false, error: error.message };
      }

      // Update deployment history
      await supabase
        .from('project_deployments')
        .insert({
          project_id: project.id,
          deployment_type: 'schema',
          deployment_data: { sql },
          status: 'success',
          deployed_at: new Date().toISOString(),
        });

      return { success: true };
    } catch (error: any) {
      console.error('Schema deployment error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get region based on plan
   */
  private getRegionForPlan(plan: string): string {
    // Distribute based on plan tier
    const regions = {
      starter: 'us-east-1',
      professional: 'us-west-1',
      business: 'eu-central-1',
      enterprise: 'ap-southeast-1',
    };
    return regions[plan as keyof typeof regions] || 'us-east-1';
  }

  /**
   * Generate secure password
   */
  private generateSecurePassword(): string {
    return crypto.randomBytes(32).toString('base64').replace(/[+/=]/g, '');
  }

  /**
   * Encrypt sensitive data
   */
  private encryptData(data: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'change-this-32-character-key-now', 'utf8').slice(0, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  private decryptData(encryptedData: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'change-this-32-character-key-now', 'utf8').slice(0, 32);
    
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Pause/Resume project (for billing)
   */
  async pauseProject(projectId: string): Promise<void> {
    await fetch(`${this.managementApiUrl}/v1/projects/${projectId}/pause`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
  }

  async resumeProject(projectId: string): Promise<void> {
    await fetch(`${this.managementApiUrl}/v1/projects/${projectId}/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
  }

  /**
   * Delete project (when customer cancels)
   */
  async deleteProject(projectId: string): Promise<void> {
    await fetch(`${this.managementApiUrl}/v1/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
  }
}