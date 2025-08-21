import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createServiceClient } from '@/lib/auth/supabase';
import { generateSchema, calculateTokenUsage } from '@/lib/services/claude';
import { z } from 'zod';

const requestSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  projectId: z.string().optional(),
  useCache: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate request
    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { prompt, projectId, useCache } = validation.data;
    const supabase = await createServiceClient();

    // 3. Check cache if enabled
    if (useCache) {
      const { data: cached } = await supabase
        .from('schema_cache')
        .select('*')
        .eq('prompt_hash', hashPrompt(prompt))
        .single();

      if (cached) {
        return NextResponse.json({
          success: true,
          schema: cached.schema,
          sql: cached.sql,
          cached: true,
          tokensUsed: 0,
          costSaved: calculateCostSaved(cached.tokens_used),
        });
      }
    }

    // 4. Check usage limits
    const { data: usage } = await supabase
      .from('user_usage')
      .select('tokens_used, tokens_limit')
      .eq('user_id', user.id)
      .single();

    if (usage && usage.tokens_used >= usage.tokens_limit) {
      return NextResponse.json(
        { error: 'Usage limit exceeded. Please upgrade your plan.' },
        { status: 429 }
      );
    }

    // 5. Generate schema with Claude
    const result = await generateSchema(prompt);
    const tokensUsed = calculateTokenUsage(prompt, JSON.stringify(result));

    // 6. Store in cache
    if (useCache) {
      await supabase.from('schema_cache').insert({
        prompt_hash: hashPrompt(prompt),
        prompt,
        schema: result.tables,
        sql: result.sql,
        tokens_used: tokensUsed,
        user_id: user.id,
        project_id: projectId,
      });
    }

    // 7. Update usage
    await supabase.rpc('increment_usage', {
      user_id: user.id,
      tokens: tokensUsed,
    });

    // 8. Return response
    return NextResponse.json({
      success: true,
      schema: result.tables,
      sql: result.sql,
      explanation: result.explanation,
      cached: false,
      tokensUsed,
      costSaved: 0,
      remaining: usage ? usage.tokens_limit - usage.tokens_used - tokensUsed : 0,
    });

  } catch (error: any) {
    console.error('Schema generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate schema', details: error.message },
      { status: 500 }
    );
  }
}

function hashPrompt(prompt: string): string {
  // Simple hash for caching - in production use crypto
  return Buffer.from(prompt).toString('base64').slice(0, 32);
}

function calculateCostSaved(tokens: number): number {
  // Claude pricing: ~$0.003 per 1K tokens
  return (tokens / 1000) * 0.003;
}