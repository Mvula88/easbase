import { NextRequest, NextResponse } from 'next/server';
import { schemaGenerator } from '@/lib/services/claude-schema-generator';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Get the user session
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { businessType, description, features } = body;

    if (!businessType) {
      return NextResponse.json(
        { error: 'Business type is required' },
        { status: 400 }
      );
    }

    // Generate schema using Claude
    const schema = await schemaGenerator.generateSchema(
      businessType,
      description || `${businessType} application`,
      features || []
    );

    // Store the generated schema for caching
    await supabase.from('generated_schemas').insert({
      user_id: user.id,
      business_type: businessType,
      description: description,
      features: features,
      schema_definition: schema,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(schema);
  } catch (error) {
    console.error('Error generating schema:', error);
    return NextResponse.json(
      { error: 'Failed to generate schema' },
      { status: 500 }
    );
  }
}