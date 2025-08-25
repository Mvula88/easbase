'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  CreditCard,
  Mail,
  HardDrive,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  UserPlus,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Download,
  RefreshCw
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [metrics, setMetrics] = useState({
    totalUsers: 12847,
    activeUsers: 8234,
    totalRevenue: 84329,
    mrr: 14299,
    emailsSent: 45892,
    storageUsed: 342,
    apiCalls: 1284729,
    activeTeams: 423
  });

  const [changes, setChanges] = useState({
    users: 12.5,
    revenue: 8.3,
    emails: -3.2,
    storage: 24.8
  });

  // Chart data
  const revenueData = [
    { date: 'Mon', revenue: 4200, users: 120 },
    { date: 'Tue', revenue: 4800, users: 132 },
    { date: 'Wed', revenue: 3900, users: 101 },
    { date: 'Thu', revenue: 5100, users: 154 },
    { date: 'Fri', revenue: 4600, users: 143 },
    { date: 'Sat', revenue: 3800, users: 98 },
    { date: 'Sun', revenue: 4100, users: 112 }
  ];

  const userActivityData = [
    { hour: '00', active: 234 },
    { hour: '04', active: 189 },
    { hour: '08', active: 456 },
    { hour: '12', active: 678 },
    { hour: '16', active: 823 },
    { hour: '20', active: 567 }
  ];

  const storageBreakdown = [
    { name: 'Images', value: 45, color: '#0891b2' },
    { name: 'Documents', value: 30, color: '#10b981' },
    { name: 'Videos', value: 15, color: '#f59e0b' },
    { name: 'Other', value: 10, color: '#8b5cf6' }
  ];

  const recentActivity = [
    { id: 1, type: 'user', message: 'New user signed up', user: 'john@example.com', time: '2 min ago' },
    { id: 2, type: 'payment', message: 'Payment received', amount: '$499', time: '15 min ago' },
    { id: 3, type: 'team', message: 'New team created', team: 'Acme Corp', time: '1 hour ago' },
    { id: 4, type: 'api', message: 'API limit warning', project: 'Project X', time: '2 hours ago' },
    { id: 5, type: 'storage', message: 'Large file uploaded', size: '2.3 GB', time: '3 hours ago' }
  ];

  const topProjects = [
    { name: 'Acme Corp', users: 234, revenue: 4599, status: 'active' },
    { name: 'TechStart Inc', users: 189, revenue: 3299, status: 'active' },
    { name: 'Global Systems', users: 156, revenue: 2899, status: 'active' },
    { name: 'Innovate Labs', users: 134, revenue: 2199, status: 'trial' },
    { name: 'Digital Works', users: 98, revenue: 1899, status: 'active' }
  ];

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch real metrics from API
      const response = await fetch(`/api/admin/metrics?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
        setChanges(data.changes);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    // Export dashboard data
    console.log('Exporting dashboard data...');
  };

  const refreshData = () => {
    loadDashboardData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Monitor your platform's performance and activity</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="px-3 py-2 border rounded-lg"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button variant="outline" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
            <div className="flex items-center text-sm mt-2">
              {changes.users > 0 ? (
                <>
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-500">{changes.users}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-red-500">{Math.abs(changes.users)}%</span>
                </>
              )}
              <span className="text-gray-500 ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.mrr.toLocaleString()}</div>
            <div className="flex items-center text-sm mt-2">
              {changes.revenue > 0 ? (
                <>
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-500">{changes.revenue}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-red-500">{Math.abs(changes.revenue)}%</span>
                </>
              )}
              <span className="text-gray-500 ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.emailsSent.toLocaleString()}</div>
            <div className="flex items-center text-sm mt-2">
              {changes.emails > 0 ? (
                <>
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-500">{changes.emails}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-red-500">{Math.abs(changes.emails)}%</span>
                </>
              )}
              <span className="text-gray-500 ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.storageUsed} GB</div>
            <Progress value={68} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">68% of 500 GB used</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Users</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0891b2"
                  fill="#0891b2"
                  fillOpacity={0.3}
                  name="Revenue ($)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="users"
                  stroke="#10b981"
                  name="New Users"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="active" fill="#0891b2" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Projects */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Projects</CardTitle>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProjects.map((project) => (
                <div key={project.name} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-gray-500">{project.users} users</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${project.revenue}</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Storage Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={storageBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {storageBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {storageBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <Button variant="outline" size="sm">View All</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                  {activity.type === 'user' && <UserPlus className="h-5 w-5 text-cyan-600" />}
                  {activity.type === 'payment' && <CreditCard className="h-5 w-5 text-cyan-600" />}
                  {activity.type === 'team' && <Users className="h-5 w-5 text-cyan-600" />}
                  {activity.type === 'api' && <Activity className="h-5 w-5 text-cyan-600" />}
                  {activity.type === 'storage' && <HardDrive className="h-5 w-5 text-cyan-600" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{activity.message}</p>
                  <p className="text-sm text-gray-500">
                    {activity.user || activity.amount || activity.team || activity.project || activity.size}
                  </p>
                </div>
                <span className="text-sm text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}