import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';
import { CustomerBackendService } from '@/lib/services/customer-backend';
import { DatabaseProvisioningService } from '@/lib/services/database-provisioning';

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    // Use 'free' for testing (2 project limit), 'pro' for production ($25/month per project)
    const { businessType, projectName, description, features, plan = 'free' } = body;
    
    console.log('Creating project for user:', user.id);
    console.log('Project config:', { businessType, projectName, features, plan });
    
    // Validate input
    if (!projectName || !businessType) {
      return NextResponse.json(
        { error: 'Project name and business type are required' },
        { status: 400 }
      );
    }

    // Check if provisioning is enabled
    const provisioningService = new DatabaseProvisioningService();
    if (!provisioningService.isProvisioningEnabled()) {
      console.log('Provisioning not enabled, using shared instance approach');
      
      // Fallback to shared instance approach (MVP)
      return createSharedInstanceProject(user, projectName, businessType, features, description);
    }

    // Map business types to templates
    const templateMap: Record<string, 'saas' | 'marketplace' | 'social' | 'enterprise'> = {
      'saas': 'saas',
      'marketplace': 'marketplace',
      'ecommerce': 'marketplace',
      'social': 'social',
      'enterprise': 'enterprise',
      'default': 'saas'
    };

    const template = templateMap[businessType] || 'saas';

    try {
      // Use the new CustomerBackendService to create a real Supabase project
      const backendService = new CustomerBackendService();
      const backend = await backendService.createBackend(
        user.id,
        user.email!,
        {
          name: projectName,
          template,
          plan: plan as 'free' | 'pro' | 'enterprise'
        }
      );

      // Store in customer_projects table for backward compatibility
      const { data: project, error: createError } = await supabase
        .from('customer_projects')
        .insert({
          customer_id: user.id,
          project_name: projectName,
          business_type: businessType,
          api_key: backend.credentials.anonKey,
          status: 'active',
          features: features,
          metadata: { 
            description,
            backend_id: backend.id,
            project_id: backend.projectId
          },
          supabase_url: backend.endpoints.api,
          supabase_anon_key: backend.credentials.anonKey
        })
        .select()
        .single();

      if (createError) {
        console.error('Error storing project record:', createError);
        // Don't fail if storing fails, backend is already created
      }

      // Return project details with real Supabase backend
      return NextResponse.json({
        id: backend.id,
        projectName: projectName,
        apiKey: backend.credentials.anonKey,
        apiUrl: backend.endpoints.api,
        authUrl: backend.endpoints.auth,
        storageUrl: backend.endpoints.storage,
        realtimeUrl: backend.endpoints.realtime,
        status: 'active',
        features: features,
        plan: plan,
        createdAt: backend.createdAt,
        // Include docs URL
        docsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/backends/${backend.id}/docs`
      });

    } catch (provisioningError: any) {
      console.error('Failed to provision dedicated backend:', provisioningError);
      
      // Fallback to shared instance if provisioning fails
      console.log('Falling back to shared instance approach');
      return createSharedInstanceProject(user, projectName, businessType, features, description);
    }
    
  } catch (error: any) {
    console.error('Project creation error:', error);
    
    // Provide more specific error message
    const errorMessage = error.message || 'Internal server error';
    
    return NextResponse.json(
      { 
        error: 'Failed to create project',
        details: errorMessage,
        hint: 'Please check if you are logged in and try again'
      },
      { status: 500 }
    );
  }
}

// Fallback function for shared instance approach (MVP)
async function createSharedInstanceProject(
  user: any,
  projectName: string,
  businessType: string,
  features: any,
  description: string
) {
  const supabase = await createClient();
  
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
  
  // Generate unique project credentials for shared instance
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
      status: 'active',
      features: features,
      metadata: { description, shared_instance: true },
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
  
  // Return project details for shared instance
  return NextResponse.json({
    id: project.id,
    projectName: project.project_name,
    apiKey: project.api_key,
    apiUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/${user.id}`,
    status: 'active',
    features: features,
    createdAt: project.created_at,
    sharedInstance: true, // Indicate this is using shared instance
    upgradeAvailable: true // Show upgrade option
  });
}