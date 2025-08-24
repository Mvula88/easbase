import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/api-key';
import { CodeGeneratorFactory } from '@easbase/core/code-generators';
import { createServiceClient } from '@/lib/auth/supabase';

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const apiKeyValidation = await validateApiKey(request);
    if (!apiKeyValidation.valid) {
      return NextResponse.json(
        { error: apiKeyValidation.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      schemaId, 
      language, 
      framework, 
      includeValidation = false,
      includeComments = true,
      includeTests = false 
    } = body;

    // Validate language
    const supportedLanguages = [
      'typescript', 'javascript', 'python', 'go', 
      'rust', 'java', 'csharp', 'ruby', 'php'
    ];
    
    if (!supportedLanguages.includes(language)) {
      return NextResponse.json(
        { error: `Unsupported language. Choose from: ${supportedLanguages.join(', ')}` },
        { status: 400 }
      );
    }

    // Get schema from database
    const supabase = await createServiceClient();
    const { data: schemaData, error: schemaError } = await supabase
      .from('schemas')
      .select('*')
      .eq('id', schemaId)
      .eq('customer_id', apiKeyValidation.customerId)
      .single();

    if (schemaError || !schemaData) {
      return NextResponse.json(
        { error: 'Schema not found or unauthorized' },
        { status: 404 }
      );
    }

    // Generate code
    const generator = CodeGeneratorFactory.create({
      language,
      framework,
      includeValidation,
      includeComments,
      includeTests
    });

    const generatedCode = generator.generateFromSchema(schemaData.schema);

    // Track usage
    await supabase
      .from('code_generation_history')
      .insert({
        customer_id: apiKeyValidation.customerId,
        schema_id: schemaId,
        language,
        framework,
        files_count: generatedCode.files.length,
        generated_at: new Date().toISOString()
      });

    // Return generated code
    return NextResponse.json({
      success: true,
      language: generatedCode.language,
      framework: generatedCode.framework,
      files: generatedCode.files,
      message: `Successfully generated ${generatedCode.files.length} files for ${language}${framework ? ` (${framework})` : ''}`
    });

  } catch (error: any) {
    console.error('Code generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate code' },
      { status: 500 }
    );
  }
}

// GET endpoint to list supported languages and frameworks
export async function GET(request: NextRequest) {
  return NextResponse.json({
    languages: {
      typescript: {
        frameworks: ['nestjs', 'express', 'fastify', 'none'],
        features: ['validation', 'tests', 'repositories']
      },
      javascript: {
        frameworks: ['express', 'fastify', 'none'],
        features: ['validation', 'tests']
      },
      python: {
        frameworks: ['django', 'fastapi', 'sqlalchemy', 'pydantic'],
        features: ['validation', 'tests', 'migrations']
      },
      go: {
        frameworks: ['gin', 'echo', 'fiber', 'none'],
        features: ['validation', 'tests']
      },
      rust: {
        frameworks: ['actix', 'rocket', 'diesel', 'none'],
        features: ['validation', 'tests']
      },
      java: {
        frameworks: ['spring', 'springboot', 'hibernate', 'none'],
        features: ['validation', 'tests', 'repositories']
      },
      csharp: {
        frameworks: ['dotnet', 'efcore', 'aspnet', 'none'],
        features: ['validation', 'tests', 'repositories']
      },
      ruby: {
        frameworks: ['rails', 'sinatra', 'activerecord', 'none'],
        features: ['validation', 'tests', 'migrations']
      },
      php: {
        frameworks: ['laravel', 'symfony', 'doctrine', 'none'],
        features: ['validation', 'tests', 'migrations']
      }
    }
  });
}