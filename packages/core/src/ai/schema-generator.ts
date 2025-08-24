import { z } from 'zod';

// Schema for table column definition
const ColumnSchema = z.object({
  name: z.string(),
  type: z.enum(['uuid', 'text', 'integer', 'decimal', 'boolean', 'jsonb', 'timestamp', 'date', 'time']),
  primary: z.boolean().optional(),
  unique: z.boolean().optional(),
  required: z.boolean().optional(),
  default: z.any().optional(),
  references: z.string().optional(), // Format: "table.column"
  onDelete: z.enum(['CASCADE', 'SET NULL', 'RESTRICT']).optional(),
  index: z.boolean().optional()
});

// Schema for table definition
const TableSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  columns: z.array(ColumnSchema),
  indexes: z.array(z.object({
    name: z.string(),
    columns: z.array(z.string()),
    unique: z.boolean().optional()
  })).optional(),
  policies: z.array(z.object({
    name: z.string(),
    operation: z.enum(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL']),
    check: z.string().optional(),
    using: z.string().optional()
  })).optional()
});

// Schema for complete database schema
const DatabaseSchema = z.object({
  tables: z.array(TableSchema),
  relationships: z.array(z.object({
    from: z.string(), // table.column
    to: z.string(),   // table.column
    type: z.enum(['one-to-one', 'one-to-many', 'many-to-many'])
  })).optional(),
  enums: z.array(z.object({
    name: z.string(),
    values: z.array(z.string())
  })).optional(),
  functions: z.array(z.object({
    name: z.string(),
    definition: z.string()
  })).optional(),
  triggers: z.array(z.object({
    name: z.string(),
    table: z.string(),
    event: z.enum(['INSERT', 'UPDATE', 'DELETE']),
    timing: z.enum(['BEFORE', 'AFTER']),
    function: z.string()
  })).optional()
});

export type DatabaseSchemaType = z.infer<typeof DatabaseSchema>;
export type TableSchemaType = z.infer<typeof TableSchema>;

export class AISchemaGenerator {
  private apiKey: string;
  private model: 'claude' | 'gpt4';

  constructor(apiKey: string, model: 'claude' | 'gpt4' = 'claude') {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Generate database schema from business description
   */
  async generateFromDescription(
    businessType: string, 
    requirements: string,
    features: string[] = []
  ): Promise<DatabaseSchemaType> {
    const prompt = this.buildPrompt(businessType, requirements, features);
    
    try {
      let schemaJson: any;
      
      if (this.model === 'claude') {
        schemaJson = await this.generateWithClaude(prompt);
      } else {
        schemaJson = await this.generateWithGPT(prompt);
      }
      
      // Validate and sanitize the generated schema
      const validatedSchema = await this.validateAndSanitize(schemaJson);
      
      // Apply security best practices
      const securedSchema = this.applySecurityDefaults(validatedSchema);
      
      return securedSchema;
    } catch (error) {
      console.error('Error generating schema:', error);
      throw new Error('Failed to generate database schema');
    }
  }

  /**
   * Build the prompt for AI model
   */
  private buildPrompt(businessType: string, requirements: string, features: string[]): string {
    return `Generate a complete PostgreSQL database schema for a ${businessType} application.

Requirements:
${requirements}

Features to support:
${features.join(', ')}

Please generate a JSON schema with the following structure:
{
  "tables": [
    {
      "name": "table_name",
      "description": "What this table stores",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "primary": true,
          "default": "uuid_generate_v4()"
        },
        {
          "name": "column_name",
          "type": "text|integer|decimal|boolean|jsonb|timestamp",
          "required": true/false,
          "unique": true/false,
          "references": "other_table.id",
          "onDelete": "CASCADE"
        }
      ],
      "indexes": [
        {
          "name": "idx_table_column",
          "columns": ["column"],
          "unique": false
        }
      ],
      "policies": [
        {
          "name": "policy_name",
          "operation": "SELECT|INSERT|UPDATE|DELETE|ALL",
          "using": "auth.uid() = user_id"
        }
      ]
    }
  ],
  "relationships": [
    {
      "from": "table1.column",
      "to": "table2.column",
      "type": "one-to-many"
    }
  ]
}

Important requirements:
1. All tables should have a UUID primary key with auto-generation
2. Include created_at and updated_at timestamps for all tables
3. Add proper foreign key relationships
4. Include Row Level Security (RLS) policies for multi-tenant access
5. Add indexes for commonly queried columns
6. Follow PostgreSQL naming conventions (snake_case)
7. Include proper data types and constraints
8. Add audit fields where appropriate

Generate a production-ready schema that follows best practices.`;
  }

  /**
   * Generate schema using Claude API
   */
  private async generateWithClaude(prompt: string): Promise<any> {
    // This would integrate with Anthropic's Claude API
    // For now, returning a mock response
    return this.getMockSchema();
  }

  /**
   * Generate schema using GPT-4 API
   */
  private async generateWithGPT(prompt: string): Promise<any> {
    // This would integrate with OpenAI's GPT-4 API
    // For now, returning a mock response
    return this.getMockSchema();
  }

  /**
   * Validate and sanitize the generated schema
   */
  private async validateAndSanitize(schema: any): Promise<DatabaseSchemaType> {
    try {
      // Parse and validate using Zod
      const validated = DatabaseSchema.parse(schema);
      
      // Additional sanitization
      validated.tables = validated.tables.map(table => ({
        ...table,
        name: this.sanitizeTableName(table.name),
        columns: table.columns.map(col => ({
          ...col,
          name: this.sanitizeColumnName(col.name)
        }))
      }));
      
      return validated;
    } catch (error) {
      console.error('Schema validation error:', error);
      throw new Error('Generated schema failed validation');
    }
  }

  /**
   * Apply security defaults to the schema
   */
  private applySecurityDefaults(schema: DatabaseSchemaType): DatabaseSchemaType {
    return {
      ...schema,
      tables: schema.tables.map(table => ({
        ...table,
        // Ensure all tables have RLS policies
        policies: table.policies || [
          {
            name: `${table.name}_tenant_isolation`,
            operation: 'ALL' as const,
            using: 'auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM team_members WHERE organization_id = (SELECT organization_id FROM team_members WHERE user_id = auth.uid()))'
          }
        ],
        // Add audit columns if not present
        columns: this.ensureAuditColumns(table.columns)
      }))
    };
  }

  /**
   * Ensure audit columns are present
   */
  private ensureAuditColumns(columns: any[]): any[] {
    const hasCreatedAt = columns.some(col => col.name === 'created_at');
    const hasUpdatedAt = columns.some(col => col.name === 'updated_at');
    
    const auditColumns = [];
    
    if (!hasCreatedAt) {
      auditColumns.push({
        name: 'created_at',
        type: 'timestamp',
        default: 'NOW()',
        required: true
      });
    }
    
    if (!hasUpdatedAt) {
      auditColumns.push({
        name: 'updated_at',
        type: 'timestamp',
        default: 'NOW()',
        required: true
      });
    }
    
    return [...columns, ...auditColumns];
  }

  /**
   * Sanitize table name
   */
  private sanitizeTableName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^[0-9]/, '_$&')
      .substring(0, 63); // PostgreSQL table name limit
  }

  /**
   * Sanitize column name
   */
  private sanitizeColumnName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^[0-9]/, '_$&')
      .substring(0, 63); // PostgreSQL column name limit
  }

  /**
   * Convert schema to SQL
   */
  async toSQL(schema: DatabaseSchemaType): Promise<string> {
    const sqlStatements: string[] = [];
    
    // Create tables
    for (const table of schema.tables) {
      const columns = table.columns.map(col => {
        let sql = `${col.name} ${col.type.toUpperCase()}`;
        
        if (col.primary) sql += ' PRIMARY KEY';
        if (col.default) sql += ` DEFAULT ${col.default}`;
        if (col.required) sql += ' NOT NULL';
        if (col.unique) sql += ' UNIQUE';
        if (col.references) sql += ` REFERENCES ${col.references}`;
        if (col.onDelete) sql += ` ON DELETE ${col.onDelete}`;
        
        return sql;
      }).join(',\n  ');
      
      sqlStatements.push(`CREATE TABLE ${table.name} (\n  ${columns}\n);`);
      
      // Create indexes
      if (table.indexes) {
        for (const index of table.indexes) {
          const unique = index.unique ? 'UNIQUE ' : '';
          sqlStatements.push(
            `CREATE ${unique}INDEX ${index.name} ON ${table.name} (${index.columns.join(', ')});`
          );
        }
      }
      
      // Enable RLS
      sqlStatements.push(`ALTER TABLE ${table.name} ENABLE ROW LEVEL SECURITY;`);
      
      // Create policies
      if (table.policies) {
        for (const policy of table.policies) {
          let policySQL = `CREATE POLICY "${policy.name}" ON ${table.name}`;
          policySQL += ` FOR ${policy.operation}`;
          if (policy.using) policySQL += ` USING (${policy.using})`;
          if (policy.check) policySQL += ` WITH CHECK (${policy.check})`;
          policySQL += ';';
          sqlStatements.push(policySQL);
        }
      }
    }
    
    return sqlStatements.join('\n\n');
  }

  /**
   * Get mock schema for testing
   */
  private getMockSchema(): DatabaseSchemaType {
    return {
      tables: [
        {
          name: 'products',
          description: 'Product catalog',
          columns: [
            { name: 'id', type: 'uuid', primary: true, default: 'uuid_generate_v4()' },
            { name: 'name', type: 'text', required: true },
            { name: 'description', type: 'text' },
            { name: 'price', type: 'decimal', required: true },
            { name: 'inventory', type: 'integer', default: 0 },
            { name: 'category_id', type: 'uuid', references: 'categories.id' },
            { name: 'created_at', type: 'timestamp', default: 'NOW()' },
            { name: 'updated_at', type: 'timestamp', default: 'NOW()' }
          ]
        },
        {
          name: 'categories',
          description: 'Product categories',
          columns: [
            { name: 'id', type: 'uuid', primary: true, default: 'uuid_generate_v4()' },
            { name: 'name', type: 'text', required: true, unique: true },
            { name: 'description', type: 'text' },
            { name: 'created_at', type: 'timestamp', default: 'NOW()' }
          ]
        }
      ],
      relationships: [
        {
          from: 'products.category_id',
          to: 'categories.id',
          type: 'one-to-many'
        }
      ]
    };
  }
}