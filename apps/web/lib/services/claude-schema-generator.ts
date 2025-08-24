import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface SchemaGenerationResult {
  sql: string;
  tables: TableDefinition[];
  relationships: RelationshipDefinition[];
  indexes: IndexDefinition[];
  policies: PolicyDefinition[];
  description: string;
  businessType: string;
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  primaryKey: string;
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  unique: boolean;
  defaultValue?: string;
  references?: {
    table: string;
    column: string;
  };
}

export interface RelationshipDefinition {
  from: { table: string; column: string };
  to: { table: string; column: string };
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface IndexDefinition {
  table: string;
  columns: string[];
  unique: boolean;
  name: string;
}

export interface PolicyDefinition {
  table: string;
  name: string;
  action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  using?: string;
  check?: string;
}

export class ClaudeSchemaGenerator {
  async generateSchema(
    businessType: string,
    requirements: string,
    features: string[] = []
  ): Promise<SchemaGenerationResult> {
    const prompt = this.buildPrompt(businessType, requirements, features);
    
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const parsedResponse = this.parseResponse(content.text);
      const sql = this.generateSQL(parsedResponse);

      return {
        ...parsedResponse,
        sql,
        businessType,
        description: requirements,
      };
    } catch (error) {
      console.error('Error generating schema:', error);
      throw new Error('Failed to generate schema');
    }
  }

  private buildPrompt(
    businessType: string,
    requirements: string,
    features: string[]
  ): string {
    const featuresList = features.length > 0 ? features.join(', ') : 'standard CRUD operations';
    
    return `Generate a complete PostgreSQL database schema for a ${businessType} application.

Requirements: ${requirements}

Features needed: ${featuresList}

Please provide a comprehensive schema that includes:
1. All necessary tables with proper data types
2. Primary keys and foreign keys
3. Indexes for performance
4. Row Level Security (RLS) policies
5. Audit fields (created_at, updated_at)

Return the response as a JSON object with this exact structure:
{
  "tables": [
    {
      "name": "table_name",
      "columns": [
        {
          "name": "column_name",
          "type": "data_type",
          "nullable": boolean,
          "unique": boolean,
          "defaultValue": "default_value or null",
          "references": {
            "table": "referenced_table",
            "column": "referenced_column"
          }
        }
      ],
      "primaryKey": "primary_key_column"
    }
  ],
  "relationships": [
    {
      "from": { "table": "table1", "column": "column1" },
      "to": { "table": "table2", "column": "column2" },
      "type": "one-to-many"
    }
  ],
  "indexes": [
    {
      "table": "table_name",
      "columns": ["column1", "column2"],
      "unique": boolean,
      "name": "index_name"
    }
  ],
  "policies": [
    {
      "table": "table_name",
      "name": "policy_name",
      "action": "SELECT",
      "using": "auth.uid() = user_id",
      "check": null
    }
  ]
}

Make sure to include:
- User/account management tables
- Audit trails
- Proper relationships
- Security policies
- Performance indexes`;
  }

  private parseResponse(responseText: string): Omit<SchemaGenerationResult, 'sql' | 'businessType' | 'description'> {
    try {
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate the structure
      if (!parsed.tables || !Array.isArray(parsed.tables)) {
        throw new Error('Invalid schema structure: missing tables array');
      }

      return {
        tables: parsed.tables || [],
        relationships: parsed.relationships || [],
        indexes: parsed.indexes || [],
        policies: parsed.policies || [],
      };
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      // Return a fallback schema
      return this.getFallbackSchema();
    }
  }

  private generateSQL(schema: Omit<SchemaGenerationResult, 'sql' | 'businessType' | 'description'>): string {
    const sqlParts: string[] = [];

    // Enable extensions
    sqlParts.push('-- Enable necessary extensions');
    sqlParts.push('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    sqlParts.push('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    sqlParts.push('');

    // Create tables
    sqlParts.push('-- Create tables');
    for (const table of schema.tables) {
      const columns = table.columns.map(col => {
        let columnDef = `  ${col.name} ${col.type}`;
        
        if (col.name === table.primaryKey) {
          columnDef += ' PRIMARY KEY';
        }
        
        if (col.defaultValue) {
          columnDef += ` DEFAULT ${col.defaultValue}`;
        }
        
        if (!col.nullable) {
          columnDef += ' NOT NULL';
        }
        
        if (col.unique && col.name !== table.primaryKey) {
          columnDef += ' UNIQUE';
        }
        
        if (col.references) {
          columnDef += ` REFERENCES ${col.references.table}(${col.references.column})`;
        }
        
        return columnDef;
      });

      sqlParts.push(`CREATE TABLE IF NOT EXISTS ${table.name} (`);
      sqlParts.push(columns.join(',\n'));
      sqlParts.push(');');
      sqlParts.push('');
    }

    // Create indexes
    if (schema.indexes.length > 0) {
      sqlParts.push('-- Create indexes');
      for (const index of schema.indexes) {
        const unique = index.unique ? 'UNIQUE ' : '';
        sqlParts.push(
          `CREATE ${unique}INDEX IF NOT EXISTS ${index.name} ON ${index.table} (${index.columns.join(', ')});`
        );
      }
      sqlParts.push('');
    }

    // Enable RLS
    sqlParts.push('-- Enable Row Level Security');
    for (const table of schema.tables) {
      sqlParts.push(`ALTER TABLE ${table.name} ENABLE ROW LEVEL SECURITY;`);
    }
    sqlParts.push('');

    // Create policies
    if (schema.policies.length > 0) {
      sqlParts.push('-- Create RLS policies');
      for (const policy of schema.policies) {
        let policySQL = `CREATE POLICY "${policy.name}" ON ${policy.table} FOR ${policy.action}`;
        
        if (policy.using) {
          policySQL += ` USING (${policy.using})`;
        }
        
        if (policy.check) {
          policySQL += ` WITH CHECK (${policy.check})`;
        }
        
        sqlParts.push(policySQL + ';');
      }
      sqlParts.push('');
    }

    return sqlParts.join('\n');
  }

  private getFallbackSchema(): Omit<SchemaGenerationResult, 'sql' | 'businessType' | 'description'> {
    // Return a basic schema structure as fallback
    return {
      tables: [
        {
          name: 'users',
          columns: [
            {
              name: 'id',
              type: 'UUID',
              nullable: false,
              unique: true,
              defaultValue: 'uuid_generate_v4()',
            },
            {
              name: 'email',
              type: 'TEXT',
              nullable: false,
              unique: true,
            },
            {
              name: 'created_at',
              type: 'TIMESTAMPTZ',
              nullable: false,
              unique: false,
              defaultValue: 'NOW()',
            },
            {
              name: 'updated_at',
              type: 'TIMESTAMPTZ',
              nullable: false,
              unique: false,
              defaultValue: 'NOW()',
            },
          ],
          primaryKey: 'id',
        },
      ],
      relationships: [],
      indexes: [
        {
          table: 'users',
          columns: ['email'],
          unique: true,
          name: 'idx_users_email',
        },
      ],
      policies: [
        {
          table: 'users',
          name: 'users_select_own',
          action: 'SELECT',
          using: 'auth.uid() = id',
        },
      ],
    };
  }

  async generateFromTemplate(template: string): Promise<SchemaGenerationResult> {
    const templates: Record<string, { businessType: string; requirements: string; features: string[] }> = {
      'ecommerce': {
        businessType: 'E-commerce Platform',
        requirements: 'Online store with products, orders, customers, inventory, and reviews',
        features: ['product catalog', 'shopping cart', 'order management', 'inventory tracking', 'customer reviews', 'payment processing'],
      },
      'saas': {
        businessType: 'SaaS Application',
        requirements: 'Multi-tenant SaaS with organizations, teams, subscriptions, and usage tracking',
        features: ['multi-tenancy', 'team collaboration', 'subscription billing', 'usage metering', 'role-based access'],
      },
      'marketplace': {
        businessType: 'Marketplace Platform',
        requirements: 'Two-sided marketplace with buyers, sellers, listings, transactions, and messaging',
        features: ['buyer accounts', 'seller accounts', 'product listings', 'transactions', 'messaging system', 'ratings'],
      },
      'social': {
        businessType: 'Social Network',
        requirements: 'Social platform with profiles, posts, comments, likes, followers, and messaging',
        features: ['user profiles', 'posts/content', 'comments', 'likes/reactions', 'follow system', 'direct messaging'],
      },
      'booking': {
        businessType: 'Booking System',
        requirements: 'Appointment booking with services, providers, availability, and reservations',
        features: ['service catalog', 'provider management', 'availability calendar', 'booking management', 'reminders'],
      },
    };

    const config = templates[template] || templates['saas'];
    return this.generateSchema(config.businessType, config.requirements, config.features);
  }
}

export const schemaGenerator = new ClaudeSchemaGenerator();