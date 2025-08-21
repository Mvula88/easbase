import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface CachedResult {
  id: string;
  cache_key: string;
  prompt: string;
  response_schema: any;
  response_sql: string;
  similarity?: number;
  tokens_saved?: number;
  usage_count: number;
}

export class CacheManager {
  private supabase: SupabaseClient;
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  async findSimilar(prompt: string, threshold: number = 0.95): Promise<CachedResult | null> {
    const embedding = await this.generateEmbedding(prompt);
    
    // PostgreSQL function for vector similarity search
    const { data } = await this.supabase.rpc('find_similar_schemas', {
      query_embedding: embedding,
      similarity_threshold: threshold,
      match_limit: 5
    });
    
    if (data && data.length > 0) {
      // Update usage count and last used
      await this.supabase
        .from('cache')
        .update({ 
          usage_count: data[0].usage_count + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', data[0].id);
      
      return data[0];
    }
    
    return null;
  }

  async store(
    prompt: string, 
    result: { schema: any; sql: string },
    tokensUsed: number = 0
  ): Promise<void> {
    const embedding = await this.generateEmbedding(prompt);
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

  async invalidate(cacheKey: string): Promise<void> {
    await this.supabase
      .from('cache')
      .delete()
      .eq('cache_key', cacheKey);
  }

  async getStats(): Promise<{
    totalCached: number;
    totalHits: number;
    totalTokensSaved: number;
    avgSimilarity: number;
  }> {
    const { data: stats } = await this.supabase
      .from('cache')
      .select('usage_count, tokens_saved')
      .throwOnError();

    if (!stats || stats.length === 0) {
      return {
        totalCached: 0,
        totalHits: 0,
        totalTokensSaved: 0,
        avgSimilarity: 0
      };
    }

    const totalHits = stats.reduce((sum, item) => sum + (item.usage_count - 1), 0);
    const totalTokensSaved = stats.reduce((sum, item) => 
      sum + (item.tokens_saved * (item.usage_count - 1)), 0
    );

    return {
      totalCached: stats.length,
      totalHits,
      totalTokensSaved,
      avgSimilarity: 0.97 // Mock for now
    };
  }

  calculateCostSavings(tokensUsed: number): number {
    // Claude Opus pricing: ~$15 per 1M input tokens, ~$75 per 1M output tokens
    const avgCostPer1kTokens = 0.045; // Average of input and output
    return (tokensUsed / 1000) * avgCostPer1kTokens;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Use a hash-based approach for now (Claude doesn't have embeddings API yet)
    const hash = crypto.createHash('sha256').update(text.toLowerCase().trim()).digest();
    const embedding = Array.from(hash).map(byte => byte / 255);
    
    // Pad to 1536 dimensions
    while (embedding.length < 1536) {
      embedding.push(0);
    }
    return embedding.slice(0, 1536);
  }

  private generateCacheKey(prompt: string): string {
    return crypto.createHash('sha256')
      .update(prompt.toLowerCase().trim())
      .digest('hex');
  }

  async pruneOldCache(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data } = await this.supabase
      .from('cache')
      .delete()
      .lt('last_used_at', cutoffDate.toISOString())
      .select('id');

    return data?.length || 0;
  }

  async getMostUsedPrompts(limit: number = 10): Promise<Array<{
    prompt: string;
    usage_count: number;
    tokens_saved: number;
  }>> {
    const { data } = await this.supabase
      .from('cache')
      .select('prompt, usage_count, tokens_saved')
      .order('usage_count', { ascending: false })
      .limit(limit);

    return data || [];
  }
}