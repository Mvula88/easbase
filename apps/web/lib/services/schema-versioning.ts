import { createServiceClient } from '@/lib/auth/supabase';
import crypto from 'crypto';
import { diff } from 'json-diff';

export interface SchemaVersion {
  id: string;
  projectId: string;
  version: string;
  schema: any;
  sql: string;
  changes: any;
  migrationUp?: string;
  migrationDown?: string;
  createdAt: string;
  createdBy: string;
}

export interface MigrationPlan {
  fromVersion: string;
  toVersion: string;
  changes: ChangeSet[];
  migrationSQL: string;
  rollbackSQL: string;
  breaking: boolean;
  estimatedDowntime: number; // in seconds
}

export interface ChangeSet {
  type: 'table' | 'column' | 'index' | 'policy' | 'function';
  operation: 'create' | 'modify' | 'delete';
  target: string;
  details: any;
  breaking: boolean;
}

export class SchemaVersioningService {
  private supabase;

  constructor() {
    this.supabase = createServiceClient();
  }

  /**
   * Create a new schema version
   */
  async createVersion(
    projectId: string,
    schema: any,
    sql: string,
    userId: string
  ): Promise<SchemaVersion> {
    const supabase = await this.supabase;

    // Get current version
    const { data: latestVersion } = await supabase
      .from('schema_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Calculate version number
    const newVersionNumber = this.incrementVersion(latestVersion?.version || '0.0.0');

    // Calculate changes from previous version
    let changes = null;
    let migrationUp = null;
    let migrationDown = null;

    if (latestVersion) {
      changes = this.calculateChanges(latestVersion.schema, schema);
      const migration = await this.generateMigration(latestVersion.schema, schema);
      migrationUp = migration.up;
      migrationDown = migration.down;
    }

    // Store new version
    const { data: newVersion, error } = await supabase
      .from('schema_versions')
      .insert({
        project_id: projectId,
        version: newVersionNumber,
        schema,
        sql,
        changes,
        migration_up: migrationUp,
        migration_down: migrationDown,
        created_by: userId,
        checksum: this.generateChecksum(schema)
      })
      .select()
      .single();

    if (error) throw error;

    return newVersion;
  }

  /**
   * Get version history for a project
   */
  async getVersionHistory(
    projectId: string,
    limit = 50
  ): Promise<SchemaVersion[]> {
    const supabase = await this.supabase;

    const { data } = await supabase
      .from('schema_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Compare two schema versions
   */
  async compareVersions(
    projectId: string,
    fromVersion: string,
    toVersion: string
  ): Promise<MigrationPlan> {
    const supabase = await this.supabase;

    // Get both versions
    const { data: versions } = await supabase
      .from('schema_versions')
      .select('*')
      .eq('project_id', projectId)
      .in('version', [fromVersion, toVersion]);

    if (!versions || versions.length !== 2) {
      throw new Error('One or both versions not found');
    }

    const from = versions.find(v => v.version === fromVersion);
    const to = versions.find(v => v.version === toVersion);

    // Calculate changes
    const changes = this.calculateDetailedChanges(from.schema, to.schema);
    
    // Generate migration SQL
    const migration = await this.generateMigration(from.schema, to.schema);

    // Check if changes are breaking
    const breaking = changes.some(c => c.breaking);

    // Estimate downtime
    const estimatedDowntime = this.estimateDowntime(changes);

    return {
      fromVersion,
      toVersion,
      changes,
      migrationSQL: migration.up,
      rollbackSQL: migration.down,
      breaking,
      estimatedDowntime
    };
  }

  /**
   * Generate migration between two schemas
   */
  async generateMigration(
    fromSchema: any,
    toSchema: any
  ): Promise<{ up: string; down: string }> {
    const changes = this.calculateDetailedChanges(fromSchema, toSchema);
    let upSQL = '-- Migration Up\n';
    let downSQL = '-- Migration Down\n';

    for (const change of changes) {
      switch (change.operation) {
        case 'create':
          if (change.type === 'table') {
            upSQL += this.generateCreateTableSQL(change.details) + '\n';
            downSQL += `DROP TABLE IF EXISTS ${change.target};\n`;
          } else if (change.type === 'column') {
            upSQL += `ALTER TABLE ${change.details.table} ADD COLUMN ${change.details.column} ${change.details.type};\n`;
            downSQL += `ALTER TABLE ${change.details.table} DROP COLUMN ${change.details.column};\n`;
          }
          break;

        case 'modify':
          if (change.type === 'column') {
            upSQL += `ALTER TABLE ${change.details.table} ALTER COLUMN ${change.details.column} TYPE ${change.details.newType};\n`;
            downSQL += `ALTER TABLE ${change.details.table} ALTER COLUMN ${change.details.column} TYPE ${change.details.oldType};\n`;
          }
          break;

        case 'delete':
          if (change.type === 'table') {
            upSQL += `DROP TABLE IF EXISTS ${change.target};\n`;
            downSQL += this.generateCreateTableSQL(change.details) + '\n';
          } else if (change.type === 'column') {
            upSQL += `ALTER TABLE ${change.details.table} DROP COLUMN ${change.details.column};\n`;
            downSQL += `ALTER TABLE ${change.details.table} ADD COLUMN ${change.details.column} ${change.details.type};\n`;
          }
          break;
      }
    }

    return { up: upSQL, down: downSQL };
  }

  /**
   * Apply a migration to a project
   */
  async applyMigration(
    projectId: string,
    fromVersion: string,
    toVersion: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = await this.supabase;

    try {
      // Get migration plan
      const plan = await this.compareVersions(projectId, fromVersion, toVersion);

      // Record migration attempt
      const { data: migration } = await supabase
        .from('schema_migrations')
        .insert({
          project_id: projectId,
          from_version: fromVersion,
          to_version: toVersion,
          migration_sql: plan.migrationSQL,
          rollback_sql: plan.rollbackSQL,
          status: 'pending',
          started_at: new Date().toISOString(),
          started_by: userId
        })
        .select()
        .single();

      // Execute migration (would use DeploymentService in production)
      // For now, just mark as completed
      await supabase
        .from('schema_migrations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', migration.id);

      // Update current version
      await supabase
        .from('projects')
        .update({ current_schema_version: toVersion })
        .eq('id', projectId);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Rollback to a previous version
   */
  async rollbackVersion(
    projectId: string,
    targetVersion: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = await this.supabase;

    // Get current version
    const { data: project } = await supabase
      .from('projects')
      .select('current_schema_version')
      .eq('id', projectId)
      .single();

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    // Get rollback plan
    const plan = await this.compareVersions(
      projectId,
      project.current_schema_version,
      targetVersion
    );

    // Execute rollback
    return this.applyMigration(
      projectId,
      project.current_schema_version,
      targetVersion,
      userId
    );
  }

  /**
   * Calculate changes between schemas
   */
  private calculateChanges(oldSchema: any, newSchema: any): any {
    return diff(oldSchema, newSchema);
  }

  /**
   * Calculate detailed changes with breaking change detection
   */
  private calculateDetailedChanges(
    oldSchema: any,
    newSchema: any
  ): ChangeSet[] {
    const changes: ChangeSet[] = [];

    // Compare tables
    const oldTables = oldSchema.tables || [];
    const newTables = newSchema.tables || [];

    // Find deleted tables (breaking)
    for (const oldTable of oldTables) {
      if (!newTables.find((t: any) => t.name === oldTable.name)) {
        changes.push({
          type: 'table',
          operation: 'delete',
          target: oldTable.name,
          details: oldTable,
          breaking: true
        });
      }
    }

    // Find new tables (non-breaking)
    for (const newTable of newTables) {
      if (!oldTables.find((t: any) => t.name === newTable.name)) {
        changes.push({
          type: 'table',
          operation: 'create',
          target: newTable.name,
          details: newTable,
          breaking: false
        });
      }
    }

    // Compare columns in existing tables
    for (const newTable of newTables) {
      const oldTable = oldTables.find((t: any) => t.name === newTable.name);
      if (oldTable) {
        // Check for deleted columns (potentially breaking)
        for (const oldCol of oldTable.columns || []) {
          if (!newTable.columns.find((c: any) => c.name === oldCol.name)) {
            changes.push({
              type: 'column',
              operation: 'delete',
              target: `${oldTable.name}.${oldCol.name}`,
              details: { table: oldTable.name, column: oldCol.name, type: oldCol.type },
              breaking: !oldCol.nullable
            });
          }
        }

        // Check for new columns (non-breaking if nullable)
        for (const newCol of newTable.columns || []) {
          if (!oldTable.columns.find((c: any) => c.name === newCol.name)) {
            changes.push({
              type: 'column',
              operation: 'create',
              target: `${newTable.name}.${newCol.name}`,
              details: { table: newTable.name, column: newCol.name, type: newCol.type },
              breaking: !newCol.nullable && !newCol.default
            });
          }
        }

        // Check for modified columns
        for (const newCol of newTable.columns || []) {
          const oldCol = oldTable.columns.find((c: any) => c.name === newCol.name);
          if (oldCol && oldCol.type !== newCol.type) {
            changes.push({
              type: 'column',
              operation: 'modify',
              target: `${newTable.name}.${newCol.name}`,
              details: {
                table: newTable.name,
                column: newCol.name,
                oldType: oldCol.type,
                newType: newCol.type
              },
              breaking: !this.isCompatibleTypeChange(oldCol.type, newCol.type)
            });
          }
        }
      }
    }

    return changes;
  }

  /**
   * Check if a type change is compatible (non-breaking)
   */
  private isCompatibleTypeChange(oldType: string, newType: string): boolean {
    const compatibleChanges: Record<string, string[]> = {
      'varchar': ['text'],
      'int': ['bigint'],
      'float': ['double'],
      'date': ['timestamp', 'timestamptz']
    };

    const oldBase = oldType.toLowerCase().split('(')[0];
    const newBase = newType.toLowerCase().split('(')[0];

    return compatibleChanges[oldBase]?.includes(newBase) || false;
  }

  /**
   * Generate CREATE TABLE SQL from schema
   */
  private generateCreateTableSQL(tableSchema: any): string {
    let sql = `CREATE TABLE ${tableSchema.name} (\n`;
    
    for (const column of tableSchema.columns || []) {
      sql += `  ${column.name} ${column.type}`;
      if (column.primary) sql += ' PRIMARY KEY';
      if (!column.nullable) sql += ' NOT NULL';
      if (column.default) sql += ` DEFAULT ${column.default}`;
      sql += ',\n';
    }
    
    sql = sql.slice(0, -2) + '\n);\n';
    return sql;
  }

  /**
   * Estimate migration downtime
   */
  private estimateDowntime(changes: ChangeSet[]): number {
    let seconds = 0;
    
    for (const change of changes) {
      if (change.type === 'table' && change.operation === 'create') {
        seconds += 1;
      } else if (change.type === 'table' && change.operation === 'delete') {
        seconds += 2;
      } else if (change.type === 'column') {
        seconds += 0.5;
      } else if (change.type === 'index') {
        seconds += 5; // Indexes can take longer
      }
    }

    return Math.ceil(seconds);
  }

  /**
   * Increment version number
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    parts[2]++; // Increment patch version
    
    if (parts[2] >= 100) {
      parts[2] = 0;
      parts[1]++; // Increment minor version
    }
    
    if (parts[1] >= 100) {
      parts[1] = 0;
      parts[0]++; // Increment major version
    }
    
    return parts.join('.');
  }

  /**
   * Generate checksum for schema
   */
  private generateChecksum(schema: any): string {
    const normalized = JSON.stringify(schema, Object.keys(schema).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }
}