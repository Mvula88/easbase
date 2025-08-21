import Anthropic from '@anthropic-ai/sdk';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface SchemaColumn {
  name: string;
  type: string;
  constraints?: string[];
  default?: string;
  references?: {
    table: string;
    column: string;
  };
}

interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
  indexes?: {
    name: string;
    columns: string[];
    unique?: boolean;
  }[];
  policies?: {
    name: string;
    operation: string;
    role: string;
    using: string;
  }[];
}

interface SchemaResult {
  schema: {
    tables: SchemaTable[];
    relationships: any[];
  };
  sql: string;
}

interface GenerateResult {
  schema: any;
  sql: string;
  cached: boolean;
  tokensUsed: number;
  costSaved: number;
}

export class SchemaGenerator {
  private anthropic: Anthropic;
  private supabase: SupabaseClient;
  
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  async generateFromPrompt(prompt: string, customerId: string): Promise<GenerateResult> {
    // 1. Check cache first using vector similarity
    const cached = await this.checkCache(prompt);
    if (cached && cached.similarity > 0.95) {
      await this.updateCacheUsage(cached.id);
      return {
        schema: cached.response_schema,
        sql: cached.response_sql,
        cached: true,
        tokensUsed: 0,
        costSaved: this.calculateCostSavings(cached.tokens_saved || 4000)
      };
    }

    // 2. Generate using Claude with specific system prompt
    const systemPrompt = `You are a PostgreSQL database architect. Generate a production-ready schema based on the user's description.

    REQUIREMENTS:
    - Use UUID primary keys with gen_random_uuid()
    - Add created_at and updated_at timestamps to all tables
    - Include proper foreign key constraints
    - Add CHECK constraints for data validation
    - Create appropriate indexes for performance
    - Enable Row Level Security with policies
    - Follow PostgreSQL best practices
    - Include sample RLS policies for authenticated users

    Return response in this exact JSON format:
    {
      "schema": {
        "tables": [
          {
            "name": "table_name",
            "columns": [
              {
                "name": "column_name",
                "type": "DATA_TYPE",
                "constraints": ["NOT NULL", "UNIQUE"],
                "default": "default_value",
                "references": { "table": "other_table", "column": "id" }
              }
            ],
            "indexes": [
              { "name": "idx_name", "columns": ["column1"], "unique": false }
            ],
            "policies": [
              {
                "name": "policy_name",
                "operation": "SELECT",
                "role": "authenticated",
                "using": "auth.uid() = user_id"
              }
            ]
          }
        ],
        "relationships": [
          {
            "from": { "table": "table1", "column": "col1" },
            "to": { "table": "table2", "column": "col2" },
            "type": "one-to-many"
          }
        ]
      },
      "sql": "-- Complete SQL statements here"
    }`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate a PostgreSQL schema for: ${prompt}`
        }
      ]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    const result = JSON.parse(textContent.text) as SchemaResult;
    
    // If SQL wasn't provided, generate it from schema
    if (!result.sql) {
      result.sql = this.schemaToSQL(result.schema);
    }
    
    // 3. Generate embedding for caching
    const embedding = await this.generateEmbedding(prompt);
    
    // 4. Store in cache
    const totalTokens = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
    await this.storeInCache(prompt, embedding, result, totalTokens);
    
    // 5. Save to schemas table
    await this.saveSchema(customerId, prompt, result, totalTokens);
    
    return {
      schema: result.schema,
      sql: result.sql,
      cached: false,
      tokensUsed: totalTokens,
      costSaved: 0
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Use a hash-based approach for now (Claude doesn't have embeddings API yet)
    const hash = crypto.createHash('sha256').update(text).digest();
    const embedding = Array.from(hash).map(byte => byte / 255);
    // Pad to 1536 dimensions
    while (embedding.length < 1536) {
      embedding.push(0);
    }
    return embedding.slice(0, 1536);
  }

  private async checkCache(prompt: string) {
    const embedding = await this.generateEmbedding(prompt);
    
    // Use pgvector to find similar prompts
    const { data } = await this.supabase.rpc('find_similar_schemas', {
      query_embedding: embedding,
      similarity_threshold: 0.95,
      match_limit: 1
    });
    
    return data?.[0];
  }

  private async updateCacheUsage(cacheId: string) {
    // First get current count
    const { data: cache } = await this.supabase
      .from('cache')
      .select('usage_count')
      .eq('id', cacheId)
      .single();
    
    // Then update with incremented value
    await this.supabase
      .from('cache')
      .update({ 
        usage_count: (cache?.usage_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', cacheId);
  }

  private async storeInCache(prompt: string, embedding: number[], result: SchemaResult, tokensUsed: number) {
    const cacheKey = this.generateCacheKey(prompt);
    
    await this.supabase.from('cache').upsert({
      cache_key: cacheKey,
      prompt,
      prompt_embedding: embedding,
      response_schema: result.schema,
      response_sql: result.sql,
      model_used: 'claude-3-opus-20240229',
      tokens_saved: tokensUsed
    });
  }

  private async saveSchema(customerId: string, prompt: string, result: SchemaResult, tokensUsed: number) {
    await this.supabase.from('schemas').insert({
      customer_id: customerId,
      prompt,
      prompt_tokens: tokensUsed,
      generated_schema: result.schema,
      generated_sql: result.sql,
      cache_key: this.generateCacheKey(prompt)
    });
  }

  private generateCacheKey(prompt: string): string {
    return crypto.createHash('sha256').update(prompt.toLowerCase().trim()).digest('hex');
  }

  private calculateCostSavings(tokensUsed: number): number {
    // Claude Opus pricing: ~$15 per 1M input tokens, ~$75 per 1M output tokens
    const avgCostPer1kTokens = 0.045; // Average of input and output
    return (tokensUsed / 1000) * avgCostPer1kTokens;
  }

  private schemaToSQL(schema: any): string {
    let sql = '-- Generated by Easbase\n\n';
    
    // Generate CREATE TABLE statements
    for (const table of schema.tables) {
      sql += `CREATE TABLE IF NOT EXISTS ${table.name} (\n`;
      
      // Add columns
      const columnDefs = table.columns.map((col: SchemaColumn) => {
        let def = `  ${col.name} ${col.type}`;
        if (col.constraints) {
          def += ' ' + col.constraints.join(' ');
        }
        if (col.default) {
          def += ` DEFAULT ${col.default}`;
        }
        if (col.references) {
          def += ` REFERENCES ${col.references.table}(${col.references.column})`;
        }
        return def;
      });
      
      sql += columnDefs.join(',\n');
      sql += '\n);\n\n';
      
      // Add indexes
      for (const index of table.indexes || []) {
        const uniqueStr = index.unique ? 'UNIQUE ' : '';
        sql += `CREATE ${uniqueStr}INDEX ${index.name} ON ${table.name}(${index.columns.join(', ')});\n`;
      }
      
      // Add RLS policies
      if (table.policies?.length > 0) {
        sql += `ALTER TABLE ${table.name} ENABLE ROW LEVEL SECURITY;\n`;
        for (const policy of table.policies) {
          sql += `CREATE POLICY "${policy.name}" ON ${table.name}\n`;
          sql += `  FOR ${policy.operation}\n`;
          sql += `  TO ${policy.role}\n`;
          sql += `  USING (${policy.using});\n`;
        }
      }
      
      sql += '\n';
    }
    
    return sql;
  }
}