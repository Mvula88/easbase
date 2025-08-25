'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  Filter,
  Download,
  UserPlus,
  MoreVertical,
  Mail,
  Shield,
  Ban,
  Key,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Eye,
  Users
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  team?: string;
  lastLogin?: string;
  createdAt: string;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  subscription?: {
    plan: string;
    status: string;
  };
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Sample data
  const sampleUsers: User[] = [
    {
      id: '1',
      email: 'john.doe@example.com',
      name: 'John Doe',
      role: 'admin',
      status: 'active',
      team: 'Acme Corp',
      lastLogin: '2024-01-15 10:30',
      createdAt: '2023-06-15',
      twoFactorEnabled: true,
      emailVerified: true,
      subscription: { plan: 'Pro', status: 'active' }
    },
    {
      id: '2',
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
      role: 'user',
      status: 'active',
      team: 'TechStart',
      lastLogin: '2024-01-14 15:45',
      createdAt: '2023-08-20',
      twoFactorEnabled: false,
      emailVerified: true,
      subscription: { plan: 'Starter', status: 'active' }
    },
    {
      id: '3',
      email: 'bob.wilson@example.com',
      name: 'Bob Wilson',
      role: 'user',
      status: 'suspended',
      lastLogin: '2024-01-10 09:15',
      createdAt: '2023-09-10',
      twoFactorEnabled: false,
      emailVerified: false,
      subscription: { plan: 'Free', status: 'canceled' }
    },
    {
      id: '4',
      email: 'alice.johnson@example.com',
      name: 'Alice Johnson',
      role: 'moderator',
      status: 'active',
      team: 'Global Systems',
      lastLogin: '2024-01-15 14:20',
      createdAt: '2023-10-05',
      twoFactorEnabled: true,
      emailVerified: true,
      subscription: { plan: 'Enterprise', status: 'active' }
    },
    {
      id: '5',
      email: 'charlie.brown@example.com',
      name: 'Charlie Brown',
      role: 'user',
      status: 'pending',
      createdAt: '2024-01-14',
      twoFactorEnabled: false,
      emailVerified: false
    }
  ];

  useEffect(() => {
    loadUsers();
  }, [currentPage, filterStatus, filterRole, searchQuery]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      // const response = await fetch(`/api/admin/users?page=${currentPage}&status=${filterStatus}&role=${filterRole}&search=${searchQuery}`);
      // const data = await response.json();
      // setUsers(data.users);
      // setTotalPages(data.totalPages);
      
      // For demo, use sample data
      setTimeout(() => {
        let filtered = [...sampleUsers];
        
        if (searchQuery) {
          filtered = filtered.filter(u => 
            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        if (filterStatus !== 'all') {
          filtered = filtered.filter(u => u.status === filterStatus);
        }
        
        if (filterRole !== 'all') {
          filtered = filtered.filter(u => u.role === filterRole);
        }
        
        setUsers(filtered);
        setTotalPages(Math.ceil(filtered.length / 10));
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Failed to load users:', error);
      setLoading(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) return;
    
    console.log(`Performing ${action} on users:`, selectedUsers);
    // Implement bulk actions
    setSelectedUsers([]);
  };

  const handleUserAction = async (userId: string, action: string) => {
    console.log(`Performing ${action} on user ${userId}`);
    // Implement individual user actions
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAllUsers = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const exportUsers = () => {
    console.log('Exporting users...');
    // Implement CSV export
  };

  const getStatusBadge = (status: User['status']) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      suspended: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700'
    };
    return <Badge className={colors[status]}>{status}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700',
      moderator: 'bg-blue-100 text-blue-700',
      user: 'bg-gray-100 text-gray-700'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role] || colors.user}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-gray-500 mt-1">Manage user accounts and permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={exportUsers}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account and send them an invitation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="user@example.com" />
                </div>
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="John Doe" />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select defaultValue="user">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="send-invite" defaultChecked />
                  <Label htmlFor="send-invite">Send invitation email</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowCreateDialog(false)}>
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,847</div>
            <p className="text-xs text-green-600 mt-1">+12.5% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8,234</div>
            <p className="text-xs text-gray-500 mt-1">64% of total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">New This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
            <p className="text-xs text-green-600 mt-1">+8.3% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">With 2FA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4,521</div>
            <p className="text-xs text-gray-500 mt-1">35% adoption rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by name or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
          
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-4 mt-4 p-3 bg-cyan-50 rounded-lg">
              <span className="text-sm font-medium">{selectedUsers.length} users selected</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('activate')}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Activate
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('suspend')}>
                  <Ban className="h-4 w-4 mr-1" />
                  Suspend
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('delete')}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedUsers([])}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onCheckedChange={toggleAllUsers}
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Security</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{user.team || '-'}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span title={user.emailVerified ? "Email verified" : "Email not verified"}>
                          <Mail className={user.emailVerified ? "h-4 w-4 text-green-500" : "h-4 w-4 text-gray-300"} />
                        </span>
                        <span title={user.twoFactorEnabled ? "2FA enabled" : "2FA disabled"}>
                          <Shield className={user.twoFactorEnabled ? "h-4 w-4 text-green-500" : "h-4 w-4 text-gray-300"} />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {user.lastLogin || 'Never'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {user.createdAt}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setShowUserDetails(user)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUserAction(user.id, 'edit')}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUserAction(user.id, 'reset-password')}>
                            <Key className="h-4 w-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUserAction(user.id, 'impersonate')}>
                            <Users className="h-4 w-4 mr-2" />
                            Impersonate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status === 'suspended' ? (
                            <DropdownMenuItem onClick={() => handleUserAction(user.id, 'activate')}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleUserAction(user.id, 'suspend')}>
                              <Ban className="h-4 w-4 mr-2" />
                              Suspend
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleUserAction(user.id, 'delete')}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-gray-500">
                Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, users.length)} of {users.length} users
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      {showUserDetails && (
        <Dialog open={!!showUserDetails} onOpenChange={() => setShowUserDetails(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={showUserDetails.avatar} />
                  <AvatarFallback>{showUserDetails.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{showUserDetails.name}</h3>
                  <p className="text-gray-500">{showUserDetails.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleBadge(showUserDetails.role)}
                    {getStatusBadge(showUserDetails.status)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">User ID</Label>
                  <p className="font-mono text-sm">{showUserDetails.id}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Team</Label>
                  <p>{showUserDetails.team || 'No team assigned'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Joined</Label>
                  <p>{showUserDetails.createdAt}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Last Login</Label>
                  <p>{showUserDetails.lastLogin || 'Never'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Email Verified</Label>
                  <p className="flex items-center gap-1">
                    {showUserDetails.emailVerified ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Verified
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        Not verified
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">2FA Status</Label>
                  <p className="flex items-center gap-1">
                    {showUserDetails.twoFactorEnabled ? (
                      <>
                        <Shield className="h-4 w-4 text-green-500" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        Disabled
                      </>
                    )}
                  </p>
                </div>
              </div>
              
              {showUserDetails.subscription && (
                <div>
                  <Label className="text-gray-500">Subscription</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={showUserDetails.subscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {showUserDetails.subscription.plan}
                    </Badge>
                    <span className="text-sm text-gray-500">{showUserDetails.subscription.status}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUserDetails(null)}>
                Close
              </Button>
              <Button>Edit User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}