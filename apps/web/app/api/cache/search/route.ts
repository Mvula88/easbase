import { NextRequest, NextResponse } from 'next/server';
import { CacheManager } from '@easbase/core';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function verifyApiKey(apiKey: string | null) {
  if (!apiKey) return null;
  
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('api_key', apiKey)
    .single();
  
  return customer;
}

export async function POST(req: NextRequest) {
  try {
    // Verify API key
    const apiKey = req.headers.get('x-api-key');
    const customer = await verifyApiKey(apiKey);
    
    if (!customer) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    
    const { prompt } = await req.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    
    const cacheManager = new CacheManager();
    const result = await cacheManager.findSimilar(prompt, 0.90); // 90% similarity threshold
    
    if (result) {
      return NextResponse.json({
        found: true,
        schema: result.response_schema,
        sql: result.response_sql,
        similarity: result.similarity,
        tokensSaved: result.tokens_saved
      });
    }
    
    return NextResponse.json({
      found: false,
      message: 'No similar schemas found in cache'
    });
    
  } catch (error: any) {
    console.error('Cache search error:', error);
    return NextResponse.json(
      { error: 'Failed to search cache', details: error.message },
      { status: 500 }
    );
  }
}