import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';

// GET /api/teams/members - List organization members
export async function GET(request: NextRequest) {
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

    // Check if user is a member
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      );
    }

    // Get all members
    const { data: members, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        user_profiles(
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('organization_id', organizationId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      members,
      currentUserRole: membership.role,
    });
  } catch (error: any) {
    console.error('Get members error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/teams/members - Update member role
export async function PATCH(request: NextRequest) {
  try {
    const { organizationId, memberId, role } = await request.json();

    if (!organizationId || !memberId || !role) {
      return NextResponse.json(
        { error: 'Organization ID, member ID, and role are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "member"' },
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
    const { data: currentMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update member roles' },
        { status: 403 }
      );
    }

    // Check target member exists and is not owner
    const { data: targetMember } = await supabase
      .from('organization_members')
      .select('role, user_id')
      .eq('organization_id', organizationId)
      .eq('user_id', memberId)
      .single();

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    if (targetMember.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot change owner role' },
        { status: 400 }
      );
    }

    // Update member role
    const { data, error } = await supabase
      .from('organization_members')
      .update({ 
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('user_id', memberId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      member: data,
      message: 'Member role updated successfully',
    });
  } catch (error: any) {
    console.error('Update member error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/members - Remove member from organization
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const memberId = searchParams.get('memberId');

    if (!organizationId || !memberId) {
      return NextResponse.json(
        { error: 'Organization ID and member ID are required' },
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

    // Allow users to remove themselves, or admins/owners to remove others
    const isRemovingSelf = memberId === user.id;
    
    if (!isRemovingSelf) {
      // Check if user is owner or admin
      const { data: currentMember } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .single();

      if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions to remove members' },
          { status: 403 }
        );
      }

      // Check if target is owner
      const { data: targetMember } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', memberId)
        .single();

      if (targetMember?.role === 'owner') {
        return NextResponse.json(
          { error: 'Cannot remove the owner from organization' },
          { status: 400 }
        );
      }
    }

    // Remove member
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', memberId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: isRemovingSelf 
        ? 'You have left the organization' 
        : 'Member removed successfully',
    });
  } catch (error: any) {
    console.error('Remove member error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}