import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/auth/supabase';

export async function POST(req: NextRequest) {
  try {
    // Verify API key
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }
    
    const supabase = await createServiceClient();
    
    // Verify customer
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('api_key', apiKey)
      .single();
    
    if (!customer) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    
    const { prompt } = await req.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    
    // Search for similar schemas in cache
    const promptHash = Buffer.from(prompt).toString('base64').slice(0, 32);
    
    const { data: cached } = await supabase
      .from('schema_cache')
      .select('*')
      .eq('prompt_hash', promptHash)
      .single();
    
    if (cached) {
      return NextResponse.json({
        found: true,
        schema: cached.schema,
        sql: cached.sql,
        tokensSaved: cached.tokens_used
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