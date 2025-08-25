'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Settings,
  Trash2,
  Check,
  X,
  Clock,
  Code,
  Database,
  CreditCard,
  Eye,
  Edit,
  Key,
  AlertCircle,
} from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'developer' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  joined_at: string;
  last_active?: string;
  permissions: string[];
}

interface TeamInvite {
  id: string;
  email: string;
  role: string;
  invited_by: string;
  invited_at: string;
  expires_at: string;
}

const roleConfig = {
  owner: {
    label: 'Owner',
    color: 'bg-purple-500',
    permissions: ['all'],
    description: 'Full access to everything',
  },
  admin: {
    label: 'Admin',
    color: 'bg-blue-500',
    permissions: ['manage_team', 'manage_billing', 'manage_projects'],
    description: 'Manage team and projects',
  },
  developer: {
    label: 'Developer',
    color: 'bg-green-500',
    permissions: ['edit_code', 'deploy', 'view_logs'],
    description: 'Edit and deploy projects',
  },
  viewer: {
    label: 'Viewer',
    color: 'bg-gray-500',
    permissions: ['view_only'],
    description: 'Read-only access',
  },
};

export function TeamManagement({ teamId }: { teamId: string }) {
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: '1',
      email: 'owner@example.com',
      name: 'John Owner',
      role: 'owner',
      status: 'active',
      joined_at: '2024-01-01',
      permissions: ['all'],
    },
  ]);
  
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('developer');
  const [editingMember, setEditingMember] = useState<string | null>(null);

  const inviteMember = async () => {
    if (!inviteEmail) return;

    const newInvite: TeamInvite = {
      id: Date.now().toString(),
      email: inviteEmail,
      role: inviteRole,
      invited_by: 'Current User',
      invited_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    setInvites([...invites, newInvite]);
    setInviteEmail('');
    setShowInvite(false);

    // Send invite email
    await fetch('/api/teams/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_id: teamId,
        email: inviteEmail,
        role: inviteRole,
      }),
    });
  };

  const updateMemberRole = (memberId: string, newRole: string) => {
    setMembers(members.map(m => 
      m.id === memberId ? { ...m, role: newRole as any } : m
    ));
    setEditingMember(null);
  };

  const removeMember = (memberId: string) => {
    setMembers(members.filter(m => m.id !== memberId));
  };

  const cancelInvite = (inviteId: string) => {
    setInvites(invites.filter(i => i.id !== inviteId));
  };

  const resendInvite = async (inviteId: string) => {
    // Resend invite logic
    console.log('Resending invite:', inviteId);
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Management
            </CardTitle>
            <Button onClick={() => setShowInvite(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="members">
            <TabsList>
              <TabsTrigger value="members">
                Members ({members.length})
              </TabsTrigger>
              <TabsTrigger value="invites">
                Pending Invites ({invites.length})
              </TabsTrigger>
              <TabsTrigger value="permissions">
                Permissions
              </TabsTrigger>
              <TabsTrigger value="activity">
                Activity Log
              </TabsTrigger>
            </TabsList>

            {/* Members Tab */}
            <TabsContent value="members" className="mt-6">
              <div className="space-y-4">
                {members.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{member.name}</h3>
                              <Badge className={roleConfig[member.role].color}>
                                {roleConfig[member.role].label}
                              </Badge>
                              {member.status === 'active' ? (
                                <Badge variant="outline" className="text-green-600">
                                  <div className="w-2 h-2 bg-green-600 rounded-full mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  {member.status}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{member.email}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Joined {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {editingMember === member.id ? (
                            <>
                              <Select
                                value={member.role}
                                onValueChange={(value) => updateMemberRole(member.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="developer">Developer</SelectItem>
                                  <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingMember(null)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {member.role !== 'owner' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingMember(member.id)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeMember(member.id)}
                                    className="text-red-500"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Invites Tab */}
            <TabsContent value="invites" className="mt-6">
              <div className="space-y-4">
                {invites.map((invite) => (
                  <Card key={invite.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{invite.email}</span>
                            <Badge variant="outline">
                              {roleConfig[invite.role as keyof typeof roleConfig]?.label || invite.role}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Invited by {invite.invited_by} • 
                            Expires {new Date(invite.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendInvite(invite.id)}
                          >
                            Resend
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelInvite(invite.id)}
                            className="text-red-500"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {invites.length === 0 && (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No pending invites</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions" className="mt-6">
              <div className="space-y-6">
                <div className="grid gap-6">
                  {Object.entries(roleConfig).map(([role, config]) => (
                    <Card key={role}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={config.color}>
                                {config.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">
                              {config.description}
                            </p>
                            
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold mb-2">Permissions:</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {[
                                  { icon: Code, label: 'Edit Code', enabled: role !== 'viewer' },
                                  { icon: Database, label: 'Manage Database', enabled: role === 'owner' || role === 'admin' },
                                  { icon: Users, label: 'Manage Team', enabled: role === 'owner' || role === 'admin' },
                                  { icon: CreditCard, label: 'Billing', enabled: role === 'owner' },
                                  { icon: Shield, label: 'Security', enabled: role === 'owner' || role === 'admin' },
                                  { icon: Eye, label: 'View Only', enabled: true },
                                ].map((perm) => (
                                  <div key={perm.label} className="flex items-center gap-2">
                                    {perm.enabled ? (
                                      <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <X className="w-4 h-4 text-gray-300" />
                                    )}
                                    <perm.icon className="w-4 h-4 text-gray-500" />
                                    <span className={`text-sm ${!perm.enabled && 'text-gray-400'}`}>
                                      {perm.label}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Activity Log Tab */}
            <TabsContent value="activity" className="mt-6">
              <div className="space-y-4">
                {[
                  { user: 'John Owner', action: 'deployed project', target: 'production', time: '2 hours ago', icon: Code },
                  { user: 'Jane Developer', action: 'updated database schema', target: 'users table', time: '5 hours ago', icon: Database },
                  { user: 'Bob Admin', action: 'invited team member', target: 'new@example.com', time: '1 day ago', icon: UserPlus },
                  { user: 'Alice Viewer', action: 'viewed analytics', target: 'dashboard', time: '2 days ago', icon: Eye },
                ].map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <activity.icon className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{activity.user}</span>
                        {' '}{activity.action}{' '}
                        <span className="font-medium">{activity.target}</span>
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Invite Team Member</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-2">
                    {roleConfig[inviteRole as keyof typeof roleConfig]?.description}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowInvite(false)}>
                    Cancel
                  </Button>
                  <Button onClick={inviteMember}>
                    Send Invite
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}