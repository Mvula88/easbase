import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';

export async function POST(req: NextRequest) {
  console.log('Test create endpoint hit');
  
  try {
    // Test 1: Can we create Supabase client?
    const supabase = await createClient();
    console.log('Supabase client created');
    
    // Test 2: Can we get user?
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth check:', { userId: user?.id, error: authError });
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated', details: authError },
        { status: 401 }
      );
    }
    
    // Test 3: Can we read request body?
    const body = await req.json();
    console.log('Request body:', body);
    
    // Test 4: Can we query the database?
    const { data: testQuery, error: queryError } = await supabase
      .from('customer_projects')
      .select('count')
      .eq('customer_id', user.id);
    
    console.log('Database query test:', { data: testQuery, error: queryError });
    
    if (queryError) {
      return NextResponse.json(
        { 
          error: 'Database error',
          details: queryError.message,
          code: queryError.code,
          hint: queryError.hint
        },
        { status: 500 }
      );
    }
    
    // Test 5: Try to insert a test project
    const testProject = {
      customer_id: user.id,
      project_name: body.projectName || 'Test Project',
      business_type: body.businessType || 'test',
      api_key: `test_${Date.now()}`,
      status: 'active',
      features: body.features || {},
      metadata: { test: true }
    };
    
    console.log('Attempting to insert:', testProject);
    
    const { data: project, error: insertError } = await supabase
      .from('customer_projects')
      .insert(testProject)
      .select()
      .single();
    
    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { 
          error: 'Failed to create project',
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint || 'Check if customer_projects table exists and has correct schema'
        },
        { status: 500 }
      );
    }
    
    console.log('Project created successfully:', project);
    
    return NextResponse.json({
      success: true,
      project: project,
      message: 'Test project created successfully'
    });
    
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Unexpected error occurred',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}