import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface Team {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  metadata?: Record<string, any>;
}

interface TeamMember {
  user_id: string;
  team_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[];
}

interface Invitation {
  id: string;
  team_id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
}

export class TeamsService {
  private supabase: SupabaseClient;
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  // Team Management
  async createTeam(userId: string, name: string, slug?: string) {
    const teamSlug = slug || this.generateSlug(name);

    const { data: team, error: teamError } = await this.supabase
      .from('teams')
      .insert({
        name,
        slug: teamSlug,
        owner_id: userId,
        project_id: this.projectId,
        settings: {
          allow_invitations: true,
          require_2fa: false,
          allowed_domains: []
        }
      })
      .select()
      .single();

    if (teamError) throw teamError;

    // Add owner as first member
    const { error: memberError } = await this.supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: userId,
        role: 'owner',
        permissions: ['*'] // All permissions
      });

    if (memberError) throw memberError;

    return team;
  }

  async getTeam(teamId: string) {
    const { data, error } = await this.supabase
      .from('teams')
      .select(`
        *,
        team_members (
          user_id,
          role,
          joined_at,
          users (
            id,
            email,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('id', teamId)
      .eq('project_id', this.projectId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateTeam(teamId: string, updates: Partial<Team>) {
    const { data, error } = await this.supabase
      .from('teams')
      .update(updates)
      .eq('id', teamId)
      .eq('project_id', this.projectId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTeam(teamId: string, userId: string) {
    // Verify user is owner
    const isOwner = await this.isTeamOwner(teamId, userId);
    if (!isOwner) throw new Error('Only team owners can delete teams');

    const { error } = await this.supabase
      .from('teams')
      .delete()
      .eq('id', teamId)
      .eq('project_id', this.projectId);

    if (error) throw error;
    return { success: true };
  }

  // Member Management
  async addMember(teamId: string, userId: string, role: TeamMember['role'] = 'member') {
    const permissions = this.getDefaultPermissions(role);

    const { data, error } = await this.supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role,
        permissions
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateMemberRole(teamId: string, userId: string, newRole: TeamMember['role']) {
    const permissions = this.getDefaultPermissions(newRole);

    const { data, error } = await this.supabase
      .from('team_members')
      .update({
        role: newRole,
        permissions
      })
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeMember(teamId: string, userId: string) {
    // Can't remove owner
    const member = await this.getMember(teamId, userId);
    if (member?.role === 'owner') {
      throw new Error('Cannot remove team owner');
    }

    const { error } = await this.supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  }

  async getMember(teamId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return data;
  }

  async getMembers(teamId: string) {
    const { data, error } = await this.supabase
      .from('team_members')
      .select(`
        *,
        users (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Invitations
  async inviteMember(teamId: string, email: string, role: TeamMember['role'] = 'member', invitedBy: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const { data, error } = await this.supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email,
        role,
        token,
        invited_by: invitedBy,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Send invitation email
    await this.sendInvitationEmail(email, data);

    return data;
  }

  async acceptInvitation(token: string, userId: string) {
    // Get invitation
    const { data: invitation, error: inviteError } = await this.supabase
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Add user to team
    await this.addMember(invitation.team_id, userId, invitation.role);

    // Update invitation status
    await this.supabase
      .from('team_invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: userId
      })
      .eq('id', invitation.id);

    return { success: true, teamId: invitation.team_id };
  }

  async revokeInvitation(invitationId: string) {
    const { error } = await this.supabase
      .from('team_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId);

    if (error) throw error;
    return { success: true };
  }

  // Permissions
  async checkPermission(teamId: string, userId: string, permission: string): Promise<boolean> {
    const member = await this.getMember(teamId, userId);
    if (!member) return false;

    // Owner has all permissions
    if (member.role === 'owner') return true;

    // Check if user has specific permission or wildcard
    return member.permissions.includes(permission) || member.permissions.includes('*');
  }

  async updatePermissions(teamId: string, userId: string, permissions: string[]) {
    const { data, error } = await this.supabase
      .from('team_members')
      .update({ permissions })
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Team Switching
  async getUserTeams(userId: string) {
    const { data, error } = await this.supabase
      .from('team_members')
      .select(`
        team_id,
        role,
        teams (
          id,
          name,
          slug,
          logo_url
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  }

  async switchTeam(userId: string, teamId: string) {
    // Verify user is member of team
    const member = await this.getMember(teamId, userId);
    if (!member) throw new Error('Not a member of this team');

    // Update user's current team
    const { error } = await this.supabase
      .from('users')
      .update({ current_team_id: teamId })
      .eq('id', userId);

    if (error) throw error;
    return { success: true, teamId };
  }

  // Helper Methods
  private async isTeamOwner(teamId: string, userId: string): Promise<boolean> {
    const member = await this.getMember(teamId, userId);
    return member?.role === 'owner';
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private getDefaultPermissions(role: TeamMember['role']): string[] {
    const permissionMap = {
      owner: ['*'],
      admin: [
        'team.update',
        'team.members.read',
        'team.members.invite',
        'team.members.remove',
        'team.billing.read',
        'team.billing.update',
        'resources.*'
      ],
      member: [
        'team.read',
        'team.members.read',
        'resources.read',
        'resources.create',
        'resources.update'
      ],
      viewer: [
        'team.read',
        'team.members.read',
        'resources.read'
      ]
    };

    return permissionMap[role];
  }

  private async sendInvitationEmail(email: string, invitation: Invitation) {
    // Integration with email service
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/teams/invite?token=${invitation.token}`;
    
    // This would integrate with your email service
    console.log(`Sending invitation to ${email} with URL: ${inviteUrl}`);
  }

  // Activity Logging
  async logActivity(teamId: string, userId: string, action: string, metadata?: Record<string, any>) {
    const { error } = await this.supabase
      .from('team_activity_logs')
      .insert({
        team_id: teamId,
        user_id: userId,
        action,
        metadata,
        ip_address: metadata?.ip_address,
        user_agent: metadata?.user_agent
      });

    if (error) console.error('Failed to log activity:', error);
  }

  async getActivityLogs(teamId: string, limit = 50) {
    const { data, error } = await this.supabase
      .from('team_activity_logs')
      .select(`
        *,
        users (
          id,
          email,
          full_name
        )
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
}