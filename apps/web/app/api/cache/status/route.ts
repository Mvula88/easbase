import { NextRequest, NextResponse } from 'next/server';
import { CacheManager } from '@easbase/core/cache-manager';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    // Verify the API key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('api_key', apiKey)
      .single();

    if (!customer) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const cacheManager = new CacheManager();
    
    // Get cache statistics
    const stats = await cacheManager.getStats();
    const embeddingStatus = cacheManager.getEmbeddingStatus();

    return NextResponse.json({
      cache: {
        ...stats,
        hitRate: stats.totalCached > 0 
          ? ((stats.totalHits / (stats.totalHits + stats.totalCached)) * 100).toFixed(2) + '%'
          : '0%',
        costSaved: `$${(stats.totalTokensSaved * 0.000045).toFixed(2)}`
      },
      embeddings: {
        ...embeddingStatus,
        recommendation: !embeddingStatus.configured 
          ? 'Set OPENAI_API_KEY environment variable for better semantic matching'
          : 'Semantic embeddings active'
      }
    });
  } catch (error) {
    console.error('Error getting cache status:', error);
    return NextResponse.json(
      { error: 'Failed to get cache status' },
      { status: 500 }
    );
  }
}