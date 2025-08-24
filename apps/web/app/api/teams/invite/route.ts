import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';
import { getBackendOrchestrator } from '@/lib/services/backend-orchestrator';

// POST /api/teams/invite - Invite members to organization
export async function POST(request: NextRequest) {
  try {
    const { organizationId, emails, role = 'member' } = await request.json();

    if (!organizationId || !emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Organization ID and emails are required' },
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
        { error: 'Insufficient permissions to invite members' },
        { status: 403 }
      );
    }

    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Send invitations using orchestrator
    const orchestrator = await getBackendOrchestrator();
    const teamsService = orchestrator.getTeamsService();
    const commService = orchestrator.getCommunicationService();
    
    const result = await teamsService.inviteMembers({
      organizationId,
      emails,
      role,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    // Send invitation emails
    for (const email of emails) {
      await commService.sendEmail({
        to: email,
        subject: `You've been invited to join ${org.name} on Easbase`,
        template: 'team-invitation',
        html: `
          <h2>You're invited to join ${org.name}!</h2>
          <p>You've been invited to join ${org.name} as a ${role} on Easbase.</p>
          <p>Click the link below to accept the invitation:</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/invite/accept?token=TOKEN_HERE" 
             style="background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
          <p>This invitation will expire in 7 days.</p>
        `,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Invitations sent to ${emails.length} email(s)`,
      invited: emails,
    });
  } catch (error: any) {
    console.error('Invite members error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/teams/invite - Accept invitation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Please sign in to accept the invitation' },
        { status: 401 }
      );
    }

    // Find invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('organization_invitations')
      .select(`
        *,
        organizations(name, slug)
      `)
      .eq('token', token)
      .eq('email', user.email)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      );
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', invitation.organization_id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this organization' },
        { status: 400 }
      );
    }

    // Accept invitation - add user as member
    const orchestrator = await getBackendOrchestrator();
    const teamsService = orchestrator.getTeamsService();
    
    await teamsService.addMember({
      organizationId: invitation.organization_id,
      userId: user.id,
      role: invitation.role,
    });

    // Delete the invitation
    await supabase
      .from('organization_invitations')
      .delete()
      .eq('id', invitation.id);

    return NextResponse.json({
      success: true,
      message: `You've joined ${invitation.organizations.name} as a ${invitation.role}`,
      organization: invitation.organizations,
    });
  } catch (error: any) {
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}