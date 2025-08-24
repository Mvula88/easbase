import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';
import { getBackendOrchestrator } from '@/lib/services/backend-orchestrator';

// GET /api/teams - List user's organizations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organizations
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_members!inner(
          user_id,
          role,
          joined_at
        )
      `)
      .eq('organization_members.user_id', user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ organizations });
  } catch (error: any) {
    console.error('Get organizations error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/teams - Create new organization
export async function POST(request: NextRequest) {
  try {
    const { name, slug } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create organization using orchestrator
    const orchestrator = await getBackendOrchestrator();
    const teamsService = orchestrator.getTeamsService();
    
    const result = await teamsService.createOrganization({
      name,
      slug,
      ownerId: user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to create organization' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      organization: result.data,
      message: 'Organization created successfully',
    });
  } catch (error: any) {
    console.error('Create organization error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/teams - Update organization
export async function PATCH(request: NextRequest) {
  try {
    const { organizationId, name, slug } = await request.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is owner or admin
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Update organization
    const updates: any = {};
    if (name) updates.name = name;
    if (slug) updates.slug = slug;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', organizationId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      organization: data,
      message: 'Organization updated successfully',
    });
  } catch (error: any) {
    console.error('Update organization error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/teams - Delete organization
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is owner
    const { data: org } = await supabase
      .from('organizations')
      .select('owner_id')
      .eq('id', organizationId)
      .single();

    if (!org || org.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the owner can delete an organization' },
        { status: 403 }
      );
    }

    // Delete organization (cascade will handle members and invitations)
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Organization deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete organization error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}