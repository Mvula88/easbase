import { createServiceClient } from '@/lib/auth/supabase';
import { getEnv } from '@/lib/config/env';
import { SupabaseManagementService } from './supabase-management';

export interface DeploymentResult {
  success: boolean;
  deploymentId?: string;
  error?: string;
  rollbackId?: string;
}

export class DeploymentService {
  private managementService: SupabaseManagementService;

  constructor() {
    this.managementService = new SupabaseManagementService();
  }

  async deployToSupabase(
    projectId: string,
    schemaId: string,
    sql: string,
    userId: string
  ): Promise<DeploymentResult> {
    try {
      // 1. Create deployment record
      const supabase = await createServiceClient();
      const { data: deployment, error: deployError } = await supabase
        .from('deployments')
        .insert({
          project_id: projectId,
          schema_id: schemaId,
          sql_script: sql,
          user_id: userId,
          status: 'pending',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (deployError || !deployment) {
        throw new Error('Failed to create deployment record');
      }

      // 2. Create backup before deployment
      const backup = await this.createBackup(projectId, deployment.id);

      try {
        // 3. Execute SQL migrations
        await this.executeSQLMigration(projectId, sql);

        // 4. Update deployment status
        await supabase
          .from('deployments')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            backup_id: backup.id,
          })
          .eq('id', deployment.id);

        return {
          success: true,
          deploymentId: deployment.id,
          rollbackId: backup.id,
        };
      } catch (error: any) {
        // 5. Mark deployment as failed
        await supabase
          .from('deployments')
          .update({
            status: 'failed',
            error_message: error.message,
            failed_at: new Date().toISOString(),
          })
          .eq('id', deployment.id);

        // Attempt rollback
        if (backup) {
          await this.rollback(projectId, backup.id);
        }

        throw error;
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async createBackup(projectId: string, deploymentId: string) {
    const supabase = await createServiceClient();
    
    // Get current schema
    const currentSchema = await this.getCurrentSchema(projectId);
    
    const { data: backup, error } = await supabase
      .from('deployment_backups')
      .insert({
        deployment_id: deploymentId,
        project_id: projectId,
        schema_snapshot: currentSchema,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !backup) {
      throw new Error('Failed to create backup');
    }

    return backup;
  }

  private async getCurrentSchema(projectId: string): Promise<any> {
    const supabase = await createServiceClient();
    
    const { data: project } = await supabase
      .from('projects')
      .select('supabase_url, supabase_anon_key, supabase_service_key')
      .eq('id', projectId)
      .single();

    if (!project) {
      throw new Error('Project not found');
    }

    // Get actual schema from the project's Supabase instance
    const schemaInfo = await this.managementService.getSchemaInfo({
      url: project.supabase_url,
      anonKey: project.supabase_anon_key,
      serviceKey: project.supabase_service_key
    });

    return {
      ...schemaInfo,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  private async executeSQLMigration(projectId: string, sql: string): Promise<void> {
    const supabase = await createServiceClient();
    
    // Get project database credentials
    const { data: project } = await supabase
      .from('projects')
      .select('supabase_url, supabase_service_key, supabase_anon_key')
      .eq('id', projectId)
      .single();

    if (!project) {
      throw new Error('Project not found');
    }

    // Test connection first
    const connectionTest = await this.managementService.testConnection({
      url: project.supabase_url,
      anonKey: project.supabase_anon_key,
      serviceKey: project.supabase_service_key
    });

    if (!connectionTest.connected) {
      throw new Error(`Failed to connect to Supabase: ${connectionTest.error}`);
    }

    // Execute actual SQL migration
    const result = await this.managementService.executeSql(
      {
        url: project.supabase_url,
        anonKey: project.supabase_anon_key,
        serviceKey: project.supabase_service_key
      },
      sql,
      {
        validateBeforeExecute: true,
        transactional: true,
        timeout: 60000 // 60 seconds timeout
      }
    );

    if (!result.success) {
      throw new Error(result.error || 'SQL execution failed');
    }
  }

  async rollback(projectId: string, backupId: string): Promise<void> {
    const supabase = await createServiceClient();
    
    // Get backup
    const { data: backup } = await supabase
      .from('deployment_backups')
      .select('*')
      .eq('id', backupId)
      .single();

    if (!backup) {
      throw new Error('Backup not found');
    }

    // Create rollback deployment
    const { data: rollback } = await supabase
      .from('deployments')
      .insert({
        project_id: projectId,
        sql_script: this.generateRollbackSQL(backup.schema_snapshot),
        status: 'rolling_back',
        is_rollback: true,
        rollback_from: backup.deployment_id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    try {
      // Execute rollback
      await this.executeSQLMigration(
        projectId,
        this.generateRollbackSQL(backup.schema_snapshot)
      );

      // Update rollback status
      await supabase
        .from('deployments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', rollback.id);
    } catch (error: any) {
      // Mark rollback as failed
      await supabase
        .from('deployments')
        .update({
          status: 'rollback_failed',
          error_message: error.message,
          failed_at: new Date().toISOString(),
        })
        .eq('id', rollback.id);

      throw new Error(`Rollback failed: ${error.message}`);
    }
  }

  private generateRollbackSQL(schemaSnapshot: any): string {
    // Generate rollback SQL based on the schema snapshot
    let rollbackSql = `-- Rollback SQL generated at ${new Date().toISOString()}\n\n`;
    
    // Drop new tables (would need to track what was added)
    rollbackSql += `-- Drop any newly created tables\n`;
    
    // Restore previous table structures
    if (schemaSnapshot.tables && schemaSnapshot.tables.length > 0) {
      rollbackSql += `-- Restore previous table structures\n`;
      // In a real implementation, would generate CREATE TABLE statements
    }
    
    // Restore policies
    if (schemaSnapshot.policies && schemaSnapshot.policies.length > 0) {
      rollbackSql += `-- Restore RLS policies\n`;
      // Would generate CREATE POLICY statements
    }
    
    return rollbackSql;
  }

  async getDeploymentStatus(deploymentId: string) {
    const supabase = await createServiceClient();
    
    const { data: deployment } = await supabase
      .from('deployments')
      .select('*')
      .eq('id', deploymentId)
      .single();

    return deployment;
  }

  async getDeploymentHistory(projectId: string, limit = 10) {
    const supabase = await createServiceClient();
    
    const { data: deployments } = await supabase
      .from('deployments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return deployments || [];
  }
}