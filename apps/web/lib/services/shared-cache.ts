import { createServiceClient } from '@/lib/auth/supabase';
import { OpenAIEmbeddings } from '../../../../packages/core/src/embeddings/openai';
import crypto from 'crypto';

export interface SharedCacheEntry {
  id: string;
  promptPattern: string;
  schemaPattern: any;
  sql: string;
  usageCount: number;
  successRate: number;
  categories: string[];
  anonymized: boolean;
}

export class SharedCacheService {
  private supabase;
  private embeddings: OpenAIEmbeddings;

  constructor() {
    this.supabase = createServiceClient();
    this.embeddings = new OpenAIEmbeddings();
  }

  /**
   * Search shared cache across all customers
   */
  async searchSharedCache(
    prompt: string,
    categories?: string[]
  ): Promise<SharedCacheEntry[]> {
    const supabase = await this.supabase;
    
    // Generate embedding for the prompt
    const embedding = await this.embeddings.generateEmbedding(prompt);

    // Search in shared cache using vector similarity
    const { data: matches } = await supabase.rpc('search_shared_cache', {
      query_embedding: embedding,
      similarity_threshold: 0.8,
      category_filter: categories,
      limit: 10
    });

    if (!matches || matches.length === 0) {
      return [];
    }

    // Track usage for analytics
    for (const match of matches) {
      await this.incrementSharedCacheUsage(match.id);
    }

    return matches;
  }

  /**
   * Contribute a schema to shared cache (anonymized)
   */
  async contributeToSharedCache(
    prompt: string,
    schema: any,
    sql: string,
    customerId: string
  ): Promise<void> {
    const supabase = await this.supabase;

    // Check if customer has opted in to sharing
    const { data: customer } = await supabase
      .from('customers')
      .select('share_cache_enabled')
      .eq('id', customerId)
      .single();

    if (!customer?.share_cache_enabled) {
      return;
    }

    // Anonymize the schema
    const anonymized = this.anonymizeSchema(schema, sql);

    // Extract patterns and categories
    const patterns = this.extractPatterns(prompt, schema);
    const categories = this.categorizeSchema(schema);

    // Generate embedding
    const embedding = await this.embeddings.generateEmbedding(patterns.promptPattern);

    // Check if similar entry already exists
    const { data: existing } = await supabase
      .from('shared_cache')
      .select('id')
      .eq('prompt_pattern_hash', this.hashPattern(patterns.promptPattern))
      .single();

    if (existing) {
      // Update usage count
      await supabase
        .rpc('increment_cache_usage', {
          cache_id: existing.id
        });
      return;
    }

    // Store in shared cache
    await supabase
      .from('shared_cache')
      .insert({
        prompt_pattern: patterns.promptPattern,
        prompt_pattern_hash: this.hashPattern(patterns.promptPattern),
        prompt_embedding: embedding,
        schema_pattern: anonymized.schema,
        sql: anonymized.sql,
        categories,
        contributor_id: customerId,
        anonymized: true,
        usage_count: 1
      });

    // Reward contributor with credits
    await this.rewardContributor(customerId);
  }

  /**
   * Anonymize schema and SQL
   */
  private anonymizeSchema(schema: any, sql: string): { schema: any; sql: string } {
    // Clone the schema
    const anonymizedSchema = JSON.parse(JSON.stringify(schema));
    let anonymizedSQL = sql;

    // Replace specific names with generic ones
    const replacements: Record<string, string> = {};
    let tableCounter = 1;
    let columnCounter = 1;

    // Anonymize table names
    if (anonymizedSchema.tables) {
      for (const table of anonymizedSchema.tables) {
        const genericName = `table_${tableCounter++}`;
        replacements[table.name] = genericName;
        
        // Replace in SQL
        const regex = new RegExp(`\\b${table.name}\\b`, 'gi');
        anonymizedSQL = anonymizedSQL.replace(regex, genericName);
        
        table.name = genericName;

        // Anonymize column names (keep system columns)
        if (table.columns) {
          for (const column of table.columns) {
            if (!this.isSystemColumn(column.name)) {
              const genericColName = `column_${columnCounter++}`;
              replacements[column.name] = genericColName;
              
              // Replace in SQL
              const colRegex = new RegExp(`\\b${column.name}\\b`, 'gi');
              anonymizedSQL = anonymizedSQL.replace(colRegex, genericColName);
              
              column.name = genericColName;
            }
          }
        }
      }
    }

    // Remove any remaining sensitive data
    anonymizedSQL = this.removeSensitiveData(anonymizedSQL);

    return { schema: anonymizedSchema, sql: anonymizedSQL };
  }

  /**
   * Extract patterns from prompt and schema
   */
  private extractPatterns(prompt: string, schema: any): { promptPattern: string } {
    // Extract key concepts from prompt
    const concepts = this.extractConcepts(prompt);
    
    // Build pattern description
    let pattern = `Application with ${schema.tables?.length || 0} tables`;
    
    if (concepts.includes('user') || concepts.includes('auth')) {
      pattern += ', user authentication';
    }
    if (concepts.includes('payment') || concepts.includes('billing')) {
      pattern += ', payment processing';
    }
    if (concepts.includes('social') || concepts.includes('friend')) {
      pattern += ', social features';
    }
    if (concepts.includes('product') || concepts.includes('inventory')) {
      pattern += ', product management';
    }
    if (concepts.includes('order') || concepts.includes('transaction')) {
      pattern += ', order management';
    }

    return { promptPattern: pattern };
  }

  /**
   * Categorize schema based on its structure
   */
  private categorizeSchema(schema: any): string[] {
    const categories: string[] = [];
    const tableNames = schema.tables?.map((t: any) => t.name.toLowerCase()) || [];
    const allColumns = schema.tables?.flatMap((t: any) => 
      t.columns?.map((c: any) => c.name.toLowerCase()) || []
    ) || [];

    // Check for common patterns
    if (tableNames.some((t: any) => t.includes('user') || t.includes('auth'))) {
      categories.push('authentication');
    }
    if (tableNames.some((t: any) => t.includes('product') || t.includes('item'))) {
      categories.push('e-commerce');
    }
    if (tableNames.some((t: any) => t.includes('post') || t.includes('comment'))) {
      categories.push('social');
    }
    if (tableNames.some((t: any) => t.includes('payment') || t.includes('subscription'))) {
      categories.push('billing');
    }
    if (tableNames.some((t: any) => t.includes('organization') || t.includes('team'))) {
      categories.push('multi-tenant');
    }
    if (allColumns.some((c: any) => c.includes('role') || c.includes('permission'))) {
      categories.push('rbac');
    }
    if (allColumns.some((c: any) => c.includes('created_at') || c.includes('updated_at'))) {
      categories.push('audit');
    }

    // Add size category
    const tableCount = schema.tables?.length || 0;
    if (tableCount <= 5) {
      categories.push('small');
    } else if (tableCount <= 15) {
      categories.push('medium');
    } else {
      categories.push('large');
    }

    return categories;
  }

  /**
   * Extract key concepts from prompt
   */
  private extractConcepts(prompt: string): string[] {
    const concepts: string[] = [];
    const lower = prompt.toLowerCase();

    const keywords = [
      'user', 'auth', 'login', 'register',
      'product', 'item', 'inventory', 'catalog',
      'order', 'cart', 'checkout', 'payment',
      'social', 'friend', 'follow', 'post', 'comment',
      'team', 'organization', 'workspace', 'tenant',
      'billing', 'subscription', 'invoice', 'stripe'
    ];

    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        concepts.push(keyword);
      }
    }

    return concepts;
  }

  /**
   * Check if column is a system column
   */
  private isSystemColumn(name: string): boolean {
    const systemColumns = [
      'id', 'created_at', 'updated_at', 'deleted_at',
      'created_by', 'updated_by', 'user_id', 'customer_id'
    ];
    return systemColumns.includes(name.toLowerCase());
  }

  /**
   * Remove sensitive data from SQL
   */
  private removeSensitiveData(sql: string): string {
    // Remove email patterns
    sql = sql.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, 'email@example.com');
    
    // Remove URLs
    sql = sql.replace(/https?:\/\/[^\s]+/g, 'https://example.com');
    
    // Remove IP addresses
    sql = sql.replace(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, '0.0.0.0');
    
    // Remove potential API keys or tokens
    sql = sql.replace(/[a-zA-Z0-9]{32,}/g, 'REDACTED');

    return sql;
  }

  /**
   * Increment usage count for shared cache entry
   */
  private async incrementSharedCacheUsage(entryId: string): Promise<void> {
    const supabase = await this.supabase;
    
    await supabase
      .rpc('increment_cache_usage', {
        cache_id: entryId
      });
  }

  /**
   * Reward contributor with credits
   */
  private async rewardContributor(customerId: string): Promise<void> {
    const supabase = await this.supabase;
    const REWARD_TOKENS = 100; // Reward 100 tokens for contribution

    await supabase.rpc('add_bonus_tokens', {
      customer_id: customerId,
      tokens: REWARD_TOKENS,
      reason: 'Shared cache contribution'
    });
  }

  /**
   * Hash pattern for deduplication
   */
  private hashPattern(pattern: string): string {
    return crypto.createHash('sha256')
      .update(pattern.toLowerCase().trim())
      .digest('hex');
  }

  /**
   * Get sharing statistics
   */
  async getSharingStats(customerId: string): Promise<{
    contributed: number;
    tokensEarned: number;
    tokensSaved: number;
    topCategories: string[];
  }> {
    const supabase = await this.supabase;

    const { data: stats } = await supabase
      .from('shared_cache_stats')
      .select('*')
      .eq('customer_id', customerId)
      .single();

    return stats || {
      contributed: 0,
      tokensEarned: 0,
      tokensSaved: 0,
      topCategories: []
    };
  }
}