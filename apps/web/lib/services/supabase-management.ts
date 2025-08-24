import { createClient } from '@supabase/supabase-js';

export interface SupabaseProjectCredentials {
  url: string;
  anonKey: string;
  serviceKey: string;
}

export interface DeploymentOptions {
  validateBeforeExecute?: boolean;
  transactional?: boolean;
  timeout?: number; // in milliseconds
}

export class SupabaseManagementService {
  /**
   * Execute SQL directly on a Supabase project
   */
  async executeSql(
    credentials: SupabaseProjectCredentials,
    sql: string,
    options: DeploymentOptions = {}
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    const {
      validateBeforeExecute = true,
      transactional = true,
      timeout = 30000
    } = options;

    try {
      // Create a Supabase client with service role key for admin access
      const supabase = createClient(credentials.url, credentials.serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      // Validate SQL syntax before execution
      if (validateBeforeExecute) {
        const validationResult = await this.validateSql(sql);
        if (!validationResult.valid) {
          return {
            success: false,
            error: `SQL validation failed: ${validationResult.error}`
          };
        }
      }

      // Wrap in transaction if requested
      const finalSql = transactional 
        ? `BEGIN; ${sql} COMMIT;`
        : sql;

      // Execute SQL with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // Use Supabase's RPC to execute raw SQL
        // Note: This requires a custom RPC function on the Supabase side
        // Alternatively, we can use the REST API with proper headers
        const { data, error } = await supabase.rpc('execute_raw_sql', {
          sql: finalSql
        });

        clearTimeout(timeoutId);

        if (error) {
          return {
            success: false,
            error: error.message
          };
        }

        return {
          success: true,
          data
        };
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: `SQL execution timeout after ${timeout}ms`
          };
        }
        
        throw error;
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Get current schema information from a Supabase project
   */
  async getSchemaInfo(
    credentials: SupabaseProjectCredentials
  ): Promise<{ tables: any[]; functions: any[]; policies: any[] }> {
    const supabase = createClient(credentials.url, credentials.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Query information schema to get current database structure
    const tablesQuery = `
      SELECT 
        table_name,
        table_schema,
        table_type
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name;
    `;

    const columnsQuery = `
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;

    const policiesQuery = `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public';
    `;

    try {
      // Execute queries to get schema information
      const [tables, columns, policies] = await Promise.all([
        supabase.rpc('execute_raw_sql', { sql: tablesQuery }),
        supabase.rpc('execute_raw_sql', { sql: columnsQuery }),
        supabase.rpc('execute_raw_sql', { sql: policiesQuery })
      ]);

      return {
        tables: tables.data || [],
        functions: [], // Would need additional query for functions
        policies: policies.data || []
      };
    } catch (error) {
      console.error('Failed to get schema info:', error);
      return {
        tables: [],
        functions: [],
        policies: []
      };
    }
  }

  /**
   * Validate SQL syntax without executing
   */
  private async validateSql(sql: string): Promise<{ valid: boolean; error?: string }> {
    // Basic SQL validation
    const dangerousPatterns = [
      /DROP\s+DATABASE/i,
      /DELETE\s+FROM\s+pg_/i,
      /TRUNCATE\s+pg_/i,
      /ALTER\s+SYSTEM/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sql)) {
        return {
          valid: false,
          error: 'SQL contains potentially dangerous operations'
        };
      }
    }

    // Check for basic syntax issues
    const openParens = (sql.match(/\(/g) || []).length;
    const closeParens = (sql.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      return {
        valid: false,
        error: 'Mismatched parentheses'
      };
    }

    // Check for unclosed quotes
    const singleQuotes = (sql.match(/'/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      return {
        valid: false,
        error: 'Unclosed single quote'
      };
    }

    return { valid: true };
  }

  /**
   * Create a backup of current schema
   */
  async createSchemaBackup(
    credentials: SupabaseProjectCredentials
  ): Promise<string> {
    const schemaInfo = await this.getSchemaInfo(credentials);
    
    // Generate SQL to recreate current schema
    let backupSql = '-- Schema backup generated at ' + new Date().toISOString() + '\n\n';
    
    // This is a simplified version - in production, you'd want more comprehensive backup
    for (const table of schemaInfo.tables) {
      backupSql += `-- Table: ${table.table_name}\n`;
      // Would need to generate CREATE TABLE statements based on column info
    }
    
    for (const policy of schemaInfo.policies) {
      backupSql += `-- Policy: ${policy.policyname} on ${policy.tablename}\n`;
      // Would need to generate CREATE POLICY statements
    }
    
    return backupSql;
  }

  /**
   * Test connection to a Supabase project
   */
  async testConnection(
    credentials: SupabaseProjectCredentials
  ): Promise<{ connected: boolean; error?: string }> {
    try {
      const supabase = createClient(credentials.url, credentials.serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      // Try a simple query to test connection
      const { error } = await supabase.from('_dummy_table_test').select('*').limit(1);
      
      // If error is about table not existing, connection is good
      if (error && error.message.includes('does not exist')) {
        return { connected: true };
      }
      
      // If no error or different error, check further
      if (error) {
        return { 
          connected: false, 
          error: error.message 
        };
      }

      return { connected: true };
    } catch (error: any) {
      return {
        connected: false,
        error: error.message || 'Connection failed'
      };
    }
  }
}