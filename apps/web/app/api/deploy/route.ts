import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createServiceClient } from '@/lib/auth/supabase';
import { DeploymentService } from '@/lib/services/deployment';
import { z } from 'zod';

const deploySchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  schemaId: z.string().uuid('Invalid schema ID').optional(),
  sql: z.string().min(1, 'SQL script is required'),
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
    const validation = deploySchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { projectId, schemaId, sql } = validation.data;
    const supabase = await createServiceClient();

    // 3. Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // 4. Create schema record if not provided
    let finalSchemaId = schemaId;
    if (!schemaId) {
      const { data: schema } = await supabase
        .from('schemas')
        .insert({
          user_id: user.id,
          project_id: projectId,
          prompt: 'Direct SQL deployment',
          generated_schema: {},
          generated_sql: sql,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      finalSchemaId = schema?.id;
    }

    // 5. Check deployment limits
    const { data: deploymentCount } = await supabase
      .from('deployments')
      .select('id', { count: 'exact' })
      .eq('project_id', projectId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (deploymentCount && deploymentCount.length >= 10) {
      return NextResponse.json(
        { error: 'Deployment limit exceeded (max 10 per day)' },
        { status: 429 }
      );
    }

    // 6. Deploy
    const deploymentService = new DeploymentService();
    const result = await deploymentService.deployToSupabase(
      projectId,
      finalSchemaId!,
      sql,
      user.id
    );

    // 7. Log deployment activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      project_id: projectId,
      action: 'deployment',
      details: {
        schema_id: finalSchemaId,
        success: result.success,
        deployment_id: result.deploymentId,
      },
      created_at: new Date().toISOString(),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Deployment failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deploymentId: result.deploymentId,
      rollbackId: result.rollbackId,
      message: 'Schema deployed successfully',
    });

  } catch (error: any) {
    console.error('Deployment error:', error);
    return NextResponse.json(
      { error: 'Failed to deploy', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get deployment status or history
    const user = await requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const deploymentId = searchParams.get('deploymentId');
    const projectId = searchParams.get('projectId');

    const deploymentService = new DeploymentService();

    if (deploymentId) {
      const deployment = await deploymentService.getDeploymentStatus(deploymentId);
      return NextResponse.json(deployment);
    }

    if (projectId) {
      const history = await deploymentService.getDeploymentHistory(projectId);
      return NextResponse.json(history);
    }

    return NextResponse.json(
      { error: 'Either deploymentId or projectId is required' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Get deployment error:', error);
    return NextResponse.json(
      { error: 'Failed to get deployment info', details: error.message },
      { status: 500 }
    );
  }
}