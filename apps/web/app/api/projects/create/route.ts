import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const { businessType, projectName, description, features } = body;
    
    // Validate input
    if (!projectName || !businessType) {
      return NextResponse.json(
        { error: 'Project name and business type are required' },
        { status: 400 }
      );
    }
    
    // Check if user already has a project with this name
    const { data: existingProject } = await supabase
      .from('customer_projects')
      .select('id')
      .eq('customer_id', user.id)
      .eq('project_name', projectName)
      .single();
    
    if (existingProject) {
      return NextResponse.json(
        { error: 'A project with this name already exists' },
        { status: 409 }
      );
    }
    
    // For MVP, we'll use multi-tenant approach (shared Supabase)
    // In production, this would create a dedicated Supabase project
    
    // Generate unique project credentials
    const projectId = crypto.randomUUID();
    const apiKey = `easbase_${user.id.substring(0, 8)}_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
    
    // Create project record
    const { data: project, error: createError } = await supabase
      .from('customer_projects')
      .insert({
        customer_id: user.id,
        project_name: projectName,
        business_type: businessType,
        api_key: apiKey,
        status: 'provisioning',
        features: features,
        metadata: { description },
        // For MVP, we use our own Supabase instance
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating project:', createError);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }
    
    // Configure project features
    const featureConfigs = Object.entries(features)
      .filter(([_, enabled]) => enabled)
      .map(([featureType, _]) => ({
        project_id: project.id,
        feature_type: featureType,
        enabled: true,
        configuration: getDefaultFeatureConfig(featureType)
      }));
    
    if (featureConfigs.length > 0) {
      await supabase
        .from('project_features')
        .insert(featureConfigs);
    }
    
    // Apply business template (create initial schema)
    await applyBusinessTemplate(project.id, businessType, user.id);
    
    // Update project status to active
    await supabase
      .from('customer_projects')
      .update({ status: 'active' })
      .eq('id', project.id);
    
    // Return project details
    return NextResponse.json({
      id: project.id,
      projectName: project.project_name,
      apiKey: project.api_key,
      apiUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/${user.id}`,
      status: 'active',
      features: features,
      createdAt: project.created_at
    });
    
  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getDefaultFeatureConfig(featureType: string): any {
  const configs: Record<string, any> = {
    auth: {
      providers: ['email', 'google'],
      requireEmailVerification: true,
      sessionDuration: 30 * 24 * 60 * 60 // 30 days
    },
    database: {
      enableRealtime: true,
      enableRLS: true,
      backupFrequency: 'daily'
    },
    storage: {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: ['image/*', 'application/pdf'],
      buckets: ['avatars', 'documents', 'public']
    },
    email: {
      provider: 'resend',
      fromEmail: 'noreply@easbase.com',
      templates: ['welcome', 'reset-password', 'confirmation']
    },
    payments: {
      provider: 'stripe',
      currency: 'usd',
      taxCalculation: 'automatic'
    },
    analytics: {
      trackPageViews: true,
      trackApiCalls: true,
      retentionDays: 90
    }
  };
  
  return configs[featureType] || {};
}

async function applyBusinessTemplate(projectId: string, businessType: string, userId: string) {
  const supabase = await createClient();
  
  // Get template for business type
  const { data: template } = await supabase
    .from('project_templates')
    .select('*')
    .eq('business_type', businessType)
    .single();
  
  if (!template) {
    console.log('No template found for business type:', businessType);
    return;
  }
  
  // Store schema definition
  await supabase
    .from('project_schemas')
    .insert({
      project_id: projectId,
      schema_definition: template.schema_template,
      ai_generated: false,
      applied_at: new Date().toISOString()
    });
  
  // In production, this would execute SQL to create tables
  // For MVP, we'll use a shared schema with tenant isolation
  
  // Track deployment
  await supabase
    .from('project_deployments')
    .insert({
      project_id: projectId,
      deployment_type: 'schema',
      deployment_data: template.schema_template,
      status: 'success',
      deployed_by: userId
    });
}