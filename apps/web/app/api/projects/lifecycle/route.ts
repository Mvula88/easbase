import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase';
import { DatabaseProvisioningService } from '@/lib/services/database-provisioning';

// Suspend project (when payment fails)
export async function POST(req: NextRequest) {
  try {
    const { action, projectId, customerId } = await req.json();
    
    const supabase = await createClient();
    const provisioning = new DatabaseProvisioningService();

    // Verify the request is authorized
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project details
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('customer_id', customerId)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    switch (action) {
      case 'suspend':
        // Pause the Supabase project
        await provisioning.pauseProject(project.supabase_project_id);
        
        // Update status in our database
        await supabase
          .from('projects')
          .update({ 
            status: 'suspended',
            suspended_at: new Date().toISOString()
          })
          .eq('id', projectId);

        // Log the action
        await supabase
          .from('activity_logs')
          .insert({
            customer_id: customerId,
            project_id: projectId,
            action: 'project_suspended',
            details: { reason: 'payment_failed' }
          });

        return NextResponse.json({ 
          success: true, 
          message: 'Project suspended due to payment failure' 
        });

      case 'reactivate':
        // Resume the Supabase project
        await provisioning.resumeProject(project.supabase_project_id);
        
        // Update status in our database
        await supabase
          .from('projects')
          .update({ 
            status: 'active',
            suspended_at: null,
            reactivated_at: new Date().toISOString()
          })
          .eq('id', projectId);

        // Log the action
        await supabase
          .from('activity_logs')
          .insert({
            customer_id: customerId,
            project_id: projectId,
            action: 'project_reactivated',
            details: { reason: 'payment_received' }
          });

        return NextResponse.json({ 
          success: true, 
          message: 'Project reactivated successfully' 
        });

      case 'delete':
        // Permanently delete the Supabase project
        await provisioning.deleteProject(project.supabase_project_id);
        
        // Mark as deleted in our database (soft delete)
        await supabase
          .from('projects')
          .update({ 
            status: 'deleted',
            deleted_at: new Date().toISOString()
          })
          .eq('id', projectId);

        // Log the action
        await supabase
          .from('activity_logs')
          .insert({
            customer_id: customerId,
            project_id: projectId,
            action: 'project_deleted',
            details: { reason: 'customer_request' }
          });

        return NextResponse.json({ 
          success: true, 
          message: 'Project deleted permanently' 
        });

      case 'upgrade':
        // Upgrade project plan (e.g., from free to pro)
        // This would involve Supabase billing API
        // For now, just update our records
        await supabase
          .from('projects')
          .update({ 
            plan: 'pro',
            upgraded_at: new Date().toISOString()
          })
          .eq('id', projectId);

        return NextResponse.json({ 
          success: true, 
          message: 'Project upgraded to Pro plan' 
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Project lifecycle error:', error);
    return NextResponse.json(
      { error: 'Failed to manage project lifecycle' },
      { status: 500 }
    );
  }
}