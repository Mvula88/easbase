import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export interface ProjectConfig {
  name: string;
  businessType: string;
  features: {
    auth: boolean;
    database: boolean;
    storage: boolean;
    email: boolean;
    payments: boolean;
  };
  region?: string;
  plan?: 'free' | 'pro' | 'enterprise';
}

export interface ProvisionedProject {
  id: string;
  name: string;
  status: 'provisioning' | 'ready' | 'failed';
  apiUrl: string;
  apiKey: string;
  serviceKey?: string;
  databaseUrl?: string;
  createdAt: Date;
  features: ProjectConfig['features'];
}

export class ProjectProvisioningService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  async createProject(
    userId: string,
    config: ProjectConfig
  ): Promise<ProvisionedProject> {
    try {
      // Generate unique project identifiers
      const projectId = this.generateProjectId();
      const apiKey = this.generateApiKey();
      const serviceKey = this.generateServiceKey();

      // Store project in database
      const { data: project, error } = await this.supabase
        .from('customer_projects')
        .insert({
          id: projectId,
          customer_id: userId,
          project_name: config.name,
          business_type: config.businessType,
          api_key: apiKey,
          service_key_encrypted: this.encryptKey(serviceKey),
          status: 'provisioning',
          features: config.features,
          region: config.region || 'us-east-1',
          plan: config.plan || 'free',
        })
        .select()
        .single();

      if (error) throw error;

      // Initialize project resources asynchronously
      this.initializeProjectResources(projectId, config).catch(console.error);

      return {
        id: projectId,
        name: config.name,
        status: 'provisioning',
        apiUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/${projectId}`,
        apiKey: apiKey,
        serviceKey: serviceKey,
        databaseUrl: this.getDatabaseUrl(projectId),
        createdAt: new Date(project.created_at),
        features: config.features,
      };
    } catch (error) {
      console.error('Error creating project:', error);
      throw new Error('Failed to create project');
    }
  }

  private async initializeProjectResources(
    projectId: string,
    config: ProjectConfig
  ): Promise<void> {
    try {
      // Create project schema
      await this.createProjectSchema(projectId);

      // Set up authentication if enabled
      if (config.features.auth) {
        await this.setupAuthentication(projectId);
      }

      // Set up storage if enabled
      if (config.features.storage) {
        await this.setupStorage(projectId);
      }

      // Set up email service if enabled
      if (config.features.email) {
        await this.setupEmailService(projectId);
      }

      // Set up payment processing if enabled
      if (config.features.payments) {
        await this.setupPayments(projectId);
      }

      // Update project status to ready
      await this.supabase
        .from('customer_projects')
        .update({ status: 'ready', updated_at: new Date().toISOString() })
        .eq('id', projectId);
    } catch (error) {
      console.error('Error initializing project resources:', error);
      
      // Update project status to failed
      await this.supabase
        .from('customer_projects')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', projectId);
    }
  }

  private async createProjectSchema(projectId: string): Promise<void> {
    // Create isolated schema for the project
    const schemaName = `project_${projectId.replace(/-/g, '_')}`;
    
    const { error } = await this.supabase.rpc('create_project_schema', {
      schema_name: schemaName,
      project_id: projectId,
    });

    if (error) {
      console.error('Error creating project schema:', error);
      throw error;
    }
  }

  private async setupAuthentication(projectId: string): Promise<void> {
    // Set up auth tables and policies
    const authSQL = `
      -- Auth users table
      CREATE TABLE IF NOT EXISTS project_${projectId.replace(/-/g, '_')}.users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT UNIQUE NOT NULL,
        encrypted_password TEXT,
        email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Auth sessions table
      CREATE TABLE IF NOT EXISTS project_${projectId.replace(/-/g, '_')}.sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES project_${projectId.replace(/-/g, '_')}.users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Enable RLS
      ALTER TABLE project_${projectId.replace(/-/g, '_')}.users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE project_${projectId.replace(/-/g, '_')}.sessions ENABLE ROW LEVEL SECURITY;
    `;

    const { error } = await this.supabase.rpc('execute_sql', {
      sql: authSQL,
      project_id: projectId,
    });

    if (error) {
      console.error('Error setting up authentication:', error);
    }
  }

  private async setupStorage(projectId: string): Promise<void> {
    // Create storage buckets for the project
    const buckets = ['avatars', 'documents', 'public'];
    
    for (const bucket of buckets) {
      const bucketName = `${projectId}-${bucket}`;
      
      const { error } = await this.supabase.storage.createBucket(bucketName, {
        public: bucket === 'public',
        allowedMimeTypes: bucket === 'avatars' 
          ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
          : undefined,
        fileSizeLimit: bucket === 'avatars' ? 5242880 : 52428800, // 5MB for avatars, 50MB for others
      });

      if (error && !error.message.includes('already exists')) {
        console.error(`Error creating bucket ${bucketName}:`, error);
      }
    }
  }

  private async setupEmailService(projectId: string): Promise<void> {
    // Store email configuration
    const { error } = await this.supabase
      .from('project_features')
      .insert({
        project_id: projectId,
        feature_type: 'email',
        configuration: {
          provider: 'sendgrid',
          from_email: `noreply@${projectId}.easbase.dev`,
          templates: {
            welcome: true,
            password_reset: true,
            verification: true,
          },
        },
        enabled: true,
      });

    if (error) {
      console.error('Error setting up email service:', error);
    }
  }

  private async setupPayments(projectId: string): Promise<void> {
    // Store payment configuration
    const { error } = await this.supabase
      .from('project_features')
      .insert({
        project_id: projectId,
        feature_type: 'payments',
        configuration: {
          provider: 'stripe',
          currency: 'usd',
          webhook_endpoint: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/${projectId}/webhooks/stripe`,
        },
        enabled: true,
      });

    if (error) {
      console.error('Error setting up payments:', error);
    }
  }

  async getProject(projectId: string): Promise<ProvisionedProject | null> {
    const { data, error } = await this.supabase
      .from('customer_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      name: data.project_name,
      status: data.status,
      apiUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/${data.id}`,
      apiKey: data.api_key,
      databaseUrl: this.getDatabaseUrl(data.id),
      createdAt: new Date(data.created_at),
      features: data.features,
    };
  }

  async listProjects(userId: string): Promise<ProvisionedProject[]> {
    const { data, error } = await this.supabase
      .from('customer_projects')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(project => ({
      id: project.id,
      name: project.project_name,
      status: project.status,
      apiUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/${project.id}`,
      apiKey: project.api_key,
      databaseUrl: this.getDatabaseUrl(project.id),
      createdAt: new Date(project.created_at),
      features: project.features,
    }));
  }

  async deleteProject(projectId: string, userId: string): Promise<boolean> {
    // Verify ownership
    const { data: project } = await this.supabase
      .from('customer_projects')
      .select('customer_id')
      .eq('id', projectId)
      .single();

    if (!project || project.customer_id !== userId) {
      return false;
    }

    // Delete project and all associated data
    const { error } = await this.supabase
      .from('customer_projects')
      .delete()
      .eq('id', projectId);

    return !error;
  }

  private generateProjectId(): string {
    return `proj_${crypto.randomBytes(12).toString('hex')}`;
  }

  private generateApiKey(): string {
    return `easbase_${crypto.randomBytes(24).toString('hex')}`;
  }

  private generateServiceKey(): string {
    return `easbase_service_${crypto.randomBytes(32).toString('hex')}`;
  }

  private encryptKey(key: string): string {
    // In production, use proper encryption
    const algorithm = 'aes-256-cbc';
    const secretKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this';
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(
      algorithm,
      crypto.scryptSync(secretKey, 'salt', 32),
      iv
    );
    
    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private getDatabaseUrl(projectId: string): string {
    return `postgresql://easbase:password@db.easbase.dev:5432/${projectId}`;
  }

  async deploySchema(projectId: string, sql: string): Promise<boolean> {
    try {
      // Execute the SQL in the project's schema
      const schemaName = `project_${projectId.replace(/-/g, '_')}`;
      const wrappedSQL = `
        SET search_path TO ${schemaName};
        ${sql}
      `;

      const { error } = await this.supabase.rpc('execute_sql', {
        sql: wrappedSQL,
        project_id: projectId,
      });

      if (error) {
        console.error('Error deploying schema:', error);
        return false;
      }

      // Store the schema in history
      await this.supabase.from('project_schemas').insert({
        project_id: projectId,
        sql_migrations: [sql],
        applied_at: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('Error deploying schema:', error);
      return false;
    }
  }
}

export const projectProvisioning = new ProjectProvisioningService();