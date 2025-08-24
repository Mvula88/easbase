import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/auth/supabase';
import { AuthTemplateService } from '@easbase/core/auth-templates';
import { DeploymentService } from '@/lib/services/deployment';
import { validateApiKey } from '@/lib/auth/api-key';
import { trackUsage } from '@/lib/services/usage-tracking';

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

    const { customerId } = apiKeyValidation;

    // Parse request body
    const body = await request.json();
    const { template, projectId, customization } = body;

    // Validate template type
    const validTemplates = ['saas', 'marketplace', 'social', 'enterprise'];
    if (!validTemplates.includes(template)) {
      return NextResponse.json(
        { error: `Invalid template. Must be one of: ${validTemplates.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate project exists and belongs to customer
    const supabase = await createServiceClient();
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('customer_id', customerId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 404 }
      );
    }

    // Track usage
    await trackUsage(customerId!, 'deployment', {
      template,
      projectId
    });

    // Get auth template SQL
    const templateService = new AuthTemplateService();
    const templateConfig = await templateService.getTemplate(template);
    
    if (!templateConfig) {
      return NextResponse.json(
        { error: 'Template configuration not found' },
        { status: 404 }
      );
    }

    // Deploy template to project
    const deploymentService = new DeploymentService();
    const deploymentResult = await deploymentService.deployToSupabase(
      projectId,
      `auth-template-${template}`,
      templateConfig.sql,
      customerId!
    );

    if (!deploymentResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: deploymentResult.error 
        },
        { status: 500 }
      );
    }

    // Store template deployment record
    const { error: recordError } = await supabase
      .from('auth_template_deployments')
      .insert({
        project_id: projectId,
        customer_id: customerId,
        template_type: template,
        deployment_id: deploymentResult.deploymentId,
        customization: customization || {},
        deployed_at: new Date().toISOString()
      });

    if (recordError) {
      console.error('Failed to record template deployment:', recordError);
    }

    return NextResponse.json({
      success: true,
      deploymentId: deploymentResult.deploymentId,
      template,
      message: `Successfully deployed ${template} auth template to project`
    });

  } catch (error: any) {
    console.error('Auth template deployment error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to deploy auth template' 
      },
      { status: 500 }
    );
  }
}