'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Users,
  Package,
  AlertCircle,
  Download,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export default function BillingOverview() {
  const [timeRange, setTimeRange] = useState('30d');
  
  // Revenue metrics
  const metrics = {
    mrr: 84329,
    mrrGrowth: 12.5,
    arr: 1011948,
    avgRevPerUser: 189,
    ltv: 4536,
    churn: 2.3,
    totalCustomers: 447,
    paidCustomers: 423,
    trialCustomers: 24
  };

  // Revenue chart data
  const revenueData = [
    { month: 'Jan', revenue: 72000, customers: 380 },
    { month: 'Feb', revenue: 75000, customers: 395 },
    { month: 'Mar', revenue: 78000, customers: 410 },
    { month: 'Apr', revenue: 82000, customers: 425 },
    { month: 'May', revenue: 79000, customers: 420 },
    { month: 'Jun', revenue: 84329, customers: 447 }
  ];

  // Plan distribution
  const planDistribution = [
    { name: 'Starter', value: 156, revenue: 23244, color: '#0891b2' },
    { name: 'Growth', value: 189, revenue: 37422, color: '#10b981' },
    { name: 'Enterprise', value: 78, revenue: 23663, color: '#8b5cf6' },
    { name: 'Free', value: 24, revenue: 0, color: '#e5e7eb' }
  ];

  // Recent transactions
  const transactions = [
    { id: 'INV-001', customer: 'Acme Corp', amount: 4599, status: 'paid', date: '2024-01-15', plan: 'Enterprise' },
    { id: 'INV-002', customer: 'TechStart', amount: 499, status: 'paid', date: '2024-01-14', plan: 'Growth' },
    { id: 'INV-003', customer: 'Global Systems', amount: 149, status: 'pending', date: '2024-01-14', plan: 'Starter' },
    { id: 'INV-004', customer: 'Innovate Labs', amount: 499, status: 'failed', date: '2024-01-13', plan: 'Growth' },
    { id: 'INV-005', customer: 'Digital Works', amount: 149, status: 'paid', date: '2024-01-13', plan: 'Starter' }
  ];

  // Subscriptions by status
  const subscriptionStatus = [
    { status: 'Active', count: 423, percentage: 87 },
    { status: 'Trial', count: 24, percentage: 5 },
    { status: 'Past Due', count: 12, percentage: 2.5 },
    { status: 'Canceled', count: 27, percentage: 5.5 }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      paid: 'success',
      pending: 'warning',
      failed: 'destructive',
      refunded: 'secondary'
    };
    return <Badge variant={variants[status] as any}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing Overview</h1>
          <p className="text-gray-500 mt-1">Monitor revenue, subscriptions, and transactions</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="px-3 py-2 border rounded-lg"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.mrr.toLocaleString()}</div>
            <div className="flex items-center text-sm mt-2">
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">{metrics.mrrGrowth}%</span>
              <span className="text-gray-500 ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Annual Run Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(metrics.arr / 1000).toFixed(0)}K</div>
            <p className="text-xs text-gray-500 mt-2">Based on current MRR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Revenue Per User</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.avgRevPerUser}</div>
            <p className="text-xs text-gray-500 mt-2">Per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Churn Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.churn}%</div>
            <div className="flex items-center text-sm mt-2">
              <ArrowDownRight className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">-0.5%</span>
              <span className="text-gray-500 ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#0891b2"
                fill="#0891b2"
                fillOpacity={0.3}
                name="Revenue"
              />
              <Line
                type="monotone"
                dataKey="customers"
                stroke="#10b981"
                name="Customers"
                yAxisId="right"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {planDistribution.map((plan) => (
                <div key={plan.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: plan.color }} />
                    <span className="text-sm">{plan.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">{plan.value} users</span>
                    {plan.revenue > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        ${(plan.revenue / 1000).toFixed(1)}k
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Subscription Status */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscriptionStatus.map((item) => (
                <div key={item.status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{item.status}</span>
                    <span className="text-sm text-gray-500">{item.count} ({item.percentage}%)</span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Total Customers</span>
                <span className="text-xl font-bold">{metrics.totalCustomers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Conversion Rate</span>
                <span className="text-sm font-medium">94.6%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Customer LTV</span>
                <span className="text-lg font-semibold">${metrics.ltv.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">CAC Payback</span>
                <span className="text-lg font-semibold">4.2 months</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Gross Margin</span>
                <span className="text-lg font-semibold">82%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Net Revenue Retention</span>
                <span className="text-lg font-semibold">115%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Expansion Revenue</span>
                <span className="text-lg font-semibold">$12.3k</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Failed Payments</span>
                <span className="text-lg font-semibold text-red-600">3</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          <Button variant="outline" size="sm">View All</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-mono text-sm">{transaction.id}</TableCell>
                  <TableCell>{transaction.customer}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{transaction.plan}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">${transaction.amount.toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}