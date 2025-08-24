import { NextRequest, NextResponse } from 'next/server';
import { generateSchema } from '@/lib/services/ai-service';
import { z } from 'zod';

const requestSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
});

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request
    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { prompt } = validation.data;

    // Generate schema using Claude
    const result = await generateSchema(prompt);

    // Return the generated schema
    return NextResponse.json({
      success: true,
      schema: result.schema,
      sql: result.sql,
      cached: false,
      message: 'Schema generated successfully (demo mode - no auth required)'
    });

  } catch (error: any) {
    console.error('Schema generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate schema', 
        details: error.message,
        hint: 'Make sure ANTHROPIC_API_KEY is set in .env.local'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Schema Generator Demo API',
    usage: 'POST /api/generate-demo with { "prompt": "your description" }',
    example: {
      prompt: "Create an e-commerce platform with products, categories, and orders"
    }
  });
}