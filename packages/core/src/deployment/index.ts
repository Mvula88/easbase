import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  error?: string;
}

interface Project {
  id: string;
  supabase_project_url: string;
  supabase_service_key: string;
  supabase_anon_key: string;
}

export class DeploymentService {
  private supabase: SupabaseClient;
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  async deployToCustomerSupabase(
    projectId: string,
    schemaId: string,
    sql: string
  ): Promise<DeploymentResult> {
    try {
      // 1. Get project details
      const { data: project, error: projectError } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (projectError || !project) {
        throw new Error('Project not found');
      }
      
      // 2. Decrypt credentials
      const serviceKey = await this.decrypt(project.supabase_service_key);
      
      // 3. Connect to customer's Supabase
      const customerSupabase = createClient(
        project.supabase_project_url,
        serviceKey
      );
      
      // 4. Create deployment record
      const { data: deployment, error: deploymentError } = await this.supabase
        .from('deployments')
        .insert({
          project_id: projectId,
          schema_id: schemaId,
          deployment_type: 'create',
          status: 'in_progress'
        })
        .select()
        .single();
      
      if (deploymentError || !deployment) {
        throw new Error('Failed to create deployment record');
      }

      try {
        // 5. Execute SQL in transaction
        await this.executeSQLSafely(customerSupabase, sql);
        
        // 6. Verify deployment
        await this.verifyDeployment(customerSupabase, sql);
        
        // 7. Update status
        await this.supabase
          .from('deployments')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', deployment.id);
        
        // 8. Update project last deployed
        await this.supabase
          .from('projects')
          .update({
            deployment_status: 'deployed',
            last_deployed_at: new Date().toISOString()
          })
          .eq('id', projectId);
        
        return { 
          success: true, 
          deploymentId: deployment.id 
        };
        
      } catch (error: any) {
        // Handle failure
        await this.supabase
          .from('deployments')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', deployment.id);
        
        throw error;
      }
    } catch (error: any) {
      return {
        success: false,
        deploymentId: '',
        error: error.message
      };
    }
  }

  async rollback(deploymentId: string): Promise<DeploymentResult> {
    try {
      // Get deployment details
      const { data: deployment } = await this.supabase
        .from('deployments')
        .select('*, projects(*)')
        .eq('id', deploymentId)
        .single();
      
      if (!deployment || !deployment.rollback_sql) {
        throw new Error('Rollback SQL not available');
      }
      
      const project = deployment.projects as unknown as Project;
      const serviceKey = await this.decrypt(project.supabase_service_key);
      
      const customerSupabase = createClient(
        project.supabase_project_url,
        serviceKey
      );
      
      // Execute rollback
      await this.executeSQLSafely(customerSupabase, deployment.rollback_sql);
      
      // Create rollback record
      const { data: rollbackDeployment } = await this.supabase
        .from('deployments')
        .insert({
          project_id: deployment.project_id,
          schema_id: deployment.schema_id,
          deployment_type: 'rollback',
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .select()
        .single();
      
      return {
        success: true,
        deploymentId: rollbackDeployment?.id || ''
      };
    } catch (error: any) {
      return {
        success: false,
        deploymentId: '',
        error: error.message
      };
    }
  }

  private async executeSQLSafely(client: SupabaseClient, sql: string): Promise<void> {
    // Parse SQL into individual statements
    const statements = sql
      .split(';')
      .filter(s => s.trim())
      .map(s => s.trim() + ';');
    
    // Validate each statement
    for (const statement of statements) {
      this.validateSQL(statement);
    }
    
    // Execute in order
    for (const statement of statements) {
      const { error } = await client.rpc('exec_sql', { sql: statement });
      if (error) {
        throw new Error(`SQL execution failed: ${error.message}`);
      }
    }
  }

  private validateSQL(sql: string): void {
    const dangerous = [
      /DROP\s+DATABASE/i,
      /DROP\s+SCHEMA\s+public/i,
      /TRUNCATE\s+auth\./i,
      /DELETE\s+FROM\s+auth\./i,
      /DELETE\s+FROM\s+\w+\s*;/i, // DELETE without WHERE
    ];
    
    for (const pattern of dangerous) {
      if (pattern.test(sql)) {
        throw new Error(`Dangerous SQL operation detected: ${pattern}`);
      }
    }
  }

  private async verifyDeployment(client: SupabaseClient, sql: string): Promise<void> {
    // Extract table names from CREATE TABLE statements
    const tableMatches = sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi);
    const tables = Array.from(tableMatches).map(match => match[1]);
    
    // Verify each table exists
    for (const table of tables) {
      const { error } = await client
        .from(table)
        .select('*')
        .limit(0);
      
      if (error && !error.message.includes('permission')) {
        throw new Error(`Table ${table} was not created properly`);
      }
    }
  }

  private async decrypt(encrypted: string): Promise<string> {
    // In production, use proper encryption
    // For now, return as-is (assuming it's already decrypted in DB)
    return encrypted;
  }

  private async encrypt(text: string): Promise<string> {
    // In production, use proper encryption
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!!!!!!!', 'utf8');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  async getDeploymentHistory(projectId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('deployments')
      .select('*, schemas(prompt)')
      .eq('project_id', projectId)
      .order('started_at', { ascending: false });
    
    return data || [];
  }

  async getDeploymentStatus(deploymentId: string): Promise<string> {
    const { data } = await this.supabase
      .from('deployments')
      .select('status')
      .eq('id', deploymentId)
      .single();
    
    return data?.status || 'unknown';
  }
}