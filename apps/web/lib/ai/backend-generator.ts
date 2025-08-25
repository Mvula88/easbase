import Anthropic from '@anthropic-ai/sdk';

/**
 * AI-Powered Backend Generator using Claude
 * Transforms natural language into complete backend infrastructure
 */

export interface AIBackendDesign {
  projectName: string;
  description: string;
  tables: DatabaseTable[];
  relationships: TableRelationship[];
  apis: APIEndpoint[];
  authConfig: AuthConfiguration;
  features: string[];
  estimatedCost: number;
}

export interface DatabaseTable {
  name: string;
  description: string;
  columns: Column[];
  indexes: string[];
  rls: boolean;
}

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  unique: boolean;
  defaultValue?: string;
  references?: string;
}

export interface TableRelationship {
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  throughTable?: string;
}

export interface APIEndpoint {
  method: string;
  path: string;
  description: string;
  requiresAuth: boolean;
  requestBody?: any;
  responseExample?: any;
}

export interface AuthConfiguration {
  providers: string[];
  roles: string[];
  multiTenant: boolean;
  sessionDuration: number;
}

export class AIBackendGenerator {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }

  /**
   * Generate a complete backend from a natural language prompt
   */
  async generateFromPrompt(prompt: string): Promise<AIBackendDesign> {
    const systemPrompt = `You are an expert backend architect. When given an app idea, you must design a complete, production-ready backend.

Return a valid JSON object with this EXACT structure:
{
  "projectName": "string (short, url-safe name)",
  "description": "string (one line description)",
  "tables": [
    {
      "name": "string",
      "description": "string",
      "columns": [
        {
          "name": "string",
          "type": "TEXT|INTEGER|DECIMAL|BOOLEAN|UUID|TIMESTAMPTZ|JSON",
          "nullable": boolean,
          "unique": boolean,
          "defaultValue": "optional string",
          "references": "optional table.column"
        }
      ],
      "indexes": ["column_names"],
      "rls": true
    }
  ],
  "relationships": [
    {
      "from": "table.column",
      "to": "table.column",
      "type": "one-to-one|one-to-many|many-to-many",
      "throughTable": "optional for many-to-many"
    }
  ],
  "apis": [
    {
      "method": "GET|POST|PUT|DELETE",
      "path": "/api/path",
      "description": "string",
      "requiresAuth": boolean
    }
  ],
  "authConfig": {
    "providers": ["email", "google", etc],
    "roles": ["user", "admin", etc],
    "multiTenant": boolean,
    "sessionDuration": 2592000
  },
  "features": ["list", "of", "key", "features"]
}`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Design a complete backend for: ${prompt}. Be thorough and include all necessary tables, relationships, and APIs.`
          }
        ]
      });

      const responseText = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from AI response');
      }

      const design = JSON.parse(jsonMatch[0]) as AIBackendDesign;
      
      // Add cost estimation
      design.estimatedCost = this.estimateCost(design);

      return design;
    } catch (error) {
      console.error('AI generation error:', error);
      // Fallback to template-based generation
      return this.getFallbackDesign(prompt);
    }
  }

  /**
   * Generate SQL schema from AI design
   */
  generateSQL(design: AIBackendDesign): string {
    let sql = `-- Generated Backend: ${design.projectName}\n`;
    sql += `-- ${design.description}\n\n`;

    // Create tables
    for (const table of design.tables) {
      sql += `-- ${table.description}\n`;
      sql += `CREATE TABLE ${table.name} (\n`;
      
      // Add default id column
      if (!table.columns.find(c => c.name === 'id')) {
        sql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
      }

      // Add columns
      const columnDefs = table.columns.map(col => {
        let def = `  ${col.name} ${col.type}`;
        if (col.unique) def += ' UNIQUE';
        if (!col.nullable) def += ' NOT NULL';
        if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
        if (col.references) def += ` REFERENCES ${col.references}`;
        return def;
      });

      // Add timestamps if not present
      if (!table.columns.find(c => c.name === 'created_at')) {
        columnDefs.push('  created_at TIMESTAMPTZ DEFAULT NOW()');
      }
      if (!table.columns.find(c => c.name === 'updated_at')) {
        columnDefs.push('  updated_at TIMESTAMPTZ DEFAULT NOW()');
      }

      sql += columnDefs.join(',\n');
      sql += '\n);\n\n';

      // Add indexes
      for (const index of table.indexes) {
        sql += `CREATE INDEX idx_${table.name}_${index} ON ${table.name}(${index});\n`;
      }

      // Enable RLS
      if (table.rls) {
        sql += `ALTER TABLE ${table.name} ENABLE ROW LEVEL SECURITY;\n`;
      }

      sql += '\n';
    }

    // Add relationship tables for many-to-many
    for (const rel of design.relationships) {
      if (rel.type === 'many-to-many' && rel.throughTable) {
        sql += `-- Many-to-many relationship table\n`;
        sql += `CREATE TABLE ${rel.throughTable} (\n`;
        sql += `  ${rel.from.split('.')[0]}_id UUID REFERENCES ${rel.from.split('.')[0]}(id),\n`;
        sql += `  ${rel.to.split('.')[0]}_id UUID REFERENCES ${rel.to.split('.')[0]}(id),\n`;
        sql += `  created_at TIMESTAMPTZ DEFAULT NOW(),\n`;
        sql += `  PRIMARY KEY (${rel.from.split('.')[0]}_id, ${rel.to.split('.')[0]}_id)\n`;
        sql += `);\n\n`;
      }
    }

    return sql;
  }

  /**
   * Estimate monthly cost based on design complexity
   */
  private estimateCost(design: AIBackendDesign): number {
    const baseCost = 25; // Supabase Pro base
    const tableCount = design.tables.length;
    const apiCount = design.apis.length;
    
    let multiplier = 1;
    if (tableCount > 10) multiplier += 0.5;
    if (apiCount > 20) multiplier += 0.5;
    if (design.authConfig.multiTenant) multiplier += 1;
    
    return Math.round(baseCost * multiplier);
  }

  /**
   * Fallback design if AI fails
   */
  private getFallbackDesign(prompt: string): AIBackendDesign {
    const lowerPrompt = prompt.toLowerCase();
    
    // Detect app type from keywords
    if (lowerPrompt.includes('food') || lowerPrompt.includes('delivery')) {
      return this.getFoodDeliveryTemplate();
    } else if (lowerPrompt.includes('social') || lowerPrompt.includes('network')) {
      return this.getSocialNetworkTemplate();
    } else if (lowerPrompt.includes('ecommerce') || lowerPrompt.includes('shop')) {
      return this.getEcommerceTemplate();
    } else {
      return this.getGenericSaaSTemplate();
    }
  }

  private getFoodDeliveryTemplate(): AIBackendDesign {
    return {
      projectName: 'food-delivery',
      description: 'Food delivery platform with restaurants, drivers, and customers',
      tables: [
        {
          name: 'users',
          description: 'All platform users',
          columns: [
            { name: 'email', type: 'TEXT', nullable: false, unique: true },
            { name: 'name', type: 'TEXT', nullable: false, unique: false },
            { name: 'phone', type: 'TEXT', nullable: true, unique: false },
            { name: 'role', type: 'TEXT', nullable: false, unique: false },
          ],
          indexes: ['email', 'role'],
          rls: true
        },
        {
          name: 'restaurants',
          description: 'Restaurant profiles',
          columns: [
            { name: 'name', type: 'TEXT', nullable: false, unique: false },
            { name: 'owner_id', type: 'UUID', nullable: false, unique: false, references: 'users(id)' },
            { name: 'address', type: 'TEXT', nullable: false, unique: false },
            { name: 'cuisine', type: 'TEXT', nullable: false, unique: false },
          ],
          indexes: ['owner_id'],
          rls: true
        }
      ],
      relationships: [
        { from: 'restaurants.owner_id', to: 'users.id', type: 'one-to-many' }
      ],
      apis: [
        { method: 'GET', path: '/api/restaurants', description: 'List restaurants', requiresAuth: false },
        { method: 'POST', path: '/api/orders', description: 'Create order', requiresAuth: true }
      ],
      authConfig: {
        providers: ['email', 'google', 'phone'],
        roles: ['customer', 'restaurant', 'driver', 'admin'],
        multiTenant: false,
        sessionDuration: 2592000
      },
      features: ['Restaurant listing', 'Order management', 'Driver tracking', 'Payment processing'],
      estimatedCost: 25
    };
  }

  private getSocialNetworkTemplate(): AIBackendDesign {
    return {
      projectName: 'social-network',
      description: 'Social media platform with posts, followers, and messaging',
      tables: [
        {
          name: 'users',
          description: 'User profiles',
          columns: [
            { name: 'username', type: 'TEXT', nullable: false, unique: true },
            { name: 'email', type: 'TEXT', nullable: false, unique: true },
            { name: 'bio', type: 'TEXT', nullable: true, unique: false },
          ],
          indexes: ['username', 'email'],
          rls: true
        },
        {
          name: 'posts',
          description: 'User posts',
          columns: [
            { name: 'user_id', type: 'UUID', nullable: false, unique: false, references: 'users(id)' },
            { name: 'content', type: 'TEXT', nullable: false, unique: false },
            { name: 'likes', type: 'INTEGER', nullable: false, unique: false, defaultValue: '0' },
          ],
          indexes: ['user_id'],
          rls: true
        }
      ],
      relationships: [
        { from: 'posts.user_id', to: 'users.id', type: 'one-to-many' }
      ],
      apis: [
        { method: 'GET', path: '/api/posts', description: 'Get posts feed', requiresAuth: true },
        { method: 'POST', path: '/api/posts', description: 'Create post', requiresAuth: true }
      ],
      authConfig: {
        providers: ['email', 'google', 'twitter'],
        roles: ['user', 'moderator', 'admin'],
        multiTenant: false,
        sessionDuration: 2592000
      },
      features: ['User profiles', 'Posts & comments', 'Follow system', 'Direct messaging'],
      estimatedCost: 25
    };
  }

  private getEcommerceTemplate(): AIBackendDesign {
    return {
      projectName: 'ecommerce-store',
      description: 'Online store with products, cart, and checkout',
      tables: [
        {
          name: 'products',
          description: 'Product catalog',
          columns: [
            { name: 'name', type: 'TEXT', nullable: false, unique: false },
            { name: 'price', type: 'DECIMAL', nullable: false, unique: false },
            { name: 'stock', type: 'INTEGER', nullable: false, unique: false, defaultValue: '0' },
          ],
          indexes: ['name'],
          rls: true
        }
      ],
      relationships: [],
      apis: [
        { method: 'GET', path: '/api/products', description: 'List products', requiresAuth: false },
        { method: 'POST', path: '/api/checkout', description: 'Process checkout', requiresAuth: true }
      ],
      authConfig: {
        providers: ['email', 'google'],
        roles: ['customer', 'admin'],
        multiTenant: false,
        sessionDuration: 2592000
      },
      features: ['Product catalog', 'Shopping cart', 'Order management', 'Payment processing'],
      estimatedCost: 25
    };
  }

  private getGenericSaaSTemplate(): AIBackendDesign {
    return {
      projectName: 'saas-app',
      description: 'Multi-tenant SaaS application',
      tables: [
        {
          name: 'organizations',
          description: 'Customer organizations',
          columns: [
            { name: 'name', type: 'TEXT', nullable: false, unique: false },
            { name: 'plan', type: 'TEXT', nullable: false, unique: false },
          ],
          indexes: ['plan'],
          rls: true
        }
      ],
      relationships: [],
      apis: [
        { method: 'GET', path: '/api/dashboard', description: 'Get dashboard data', requiresAuth: true },
        { method: 'POST', path: '/api/invite', description: 'Invite team member', requiresAuth: true }
      ],
      authConfig: {
        providers: ['email', 'google'],
        roles: ['owner', 'admin', 'member'],
        multiTenant: true,
        sessionDuration: 2592000
      },
      features: ['Multi-tenant', 'Team management', 'Billing', 'Analytics'],
      estimatedCost: 50
    };
  }
}