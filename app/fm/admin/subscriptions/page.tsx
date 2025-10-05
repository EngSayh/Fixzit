'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  DollarSign, Users, Building2, AlertTriangle, 
  TrendingUp, Clock, CheckCircle, XCircle, 
  Filter, Download, Search 
} from 'lucide-react';

interface SubscriptionData {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
  organizationNameAr: string;
  plan: string;
  status: string;
  billingCycle: string;
  startDate: string;
  endDate?: string;
  trialEndsAt?: string;
  price: { amount: number; currency: string };
  users: {
    total: number;
    limit: number;
    breakdown: Record<string, number>;
    percentUsed: number;
  };
  usage: {
    currentUsers: number;
    currentProperties: number;
    currentWorkOrders: number;
    apiCalls: number;
    storageUsed: number;
    limitsExceeded: boolean;
    warnings: string[];
  };
  payments: {
    totalPaid: number;
    pendingAmount: number;
    currency: string;
    recentInvoices: any[];
  };
  contact: {
    email?: string;
    phone?: string;
  };
  createdAt: string;
}

export default function SubscriptionsAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [filteredSubs, setFilteredSubs] = useState<SubscriptionData[]>([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [subscriptions, statusFilter, planFilter, searchQuery]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/subscriptions');
      
      if (!res.ok) {
        if (res.status === 403) {
          setError('Unauthorized. Super admin access required.');
          router.push('/fm/dashboard');
          return;
        }
        throw new Error(`Failed to fetch: ${res.statusText}`);
      }

      const data = await res.json();
      setSummary(data.summary);
      setSubscriptions(data.subscriptions);
      setFilteredSubs(data.subscriptions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...subscriptions];

    if (statusFilter) {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    if (planFilter) {
      filtered = filtered.filter(s => s.plan === planFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.organizationName.toLowerCase().includes(query) ||
        s.organizationCode.toLowerCase().includes(query) ||
        s.contact.email?.toLowerCase().includes(query)
      );
    }

    setFilteredSubs(filtered);
  };

  const exportToCSV = () => {
    const csv = [
      ['Organization', 'Code', 'Plan', 'Status', 'Users', 'User Limit', 'Revenue (Paid)', 'Pending', 'Email', 'Created'],
      ...filteredSubs.map(s => [
        s.organizationName,
        s.organizationCode,
        s.plan,
        s.status,
        s.users.total,
        s.users.limit,
        s.payments.totalPaid,
        s.payments.pendingAmount,
        s.contact.email || '',
        new Date(s.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <AlertTriangle className="h-8 w-8 text-red-600 mb-2" />
          <h2 className="text-red-800 font-semibold mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'TRIAL': return 'bg-blue-100 text-blue-800';
      case 'SUSPENDED': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      case 'EXPIRED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'ENTERPRISE': return 'bg-purple-100 text-purple-800';
      case 'PREMIUM': return 'bg-indigo-100 text-indigo-800';
      case 'STANDARD': return 'bg-blue-100 text-blue-800';
      case 'BASIC': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription Management</h1>
        <p className="text-gray-600">Monitor all organization subscriptions, users, and payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">{summary?.totalOrganizations || 0}</span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Total Organizations</h3>
          <div className="mt-2 flex gap-2">
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              {summary?.byStatus.ACTIVE || 0} Active
            </span>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {summary?.byStatus.TRIAL || 0} Trial
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-8 w-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">{summary?.totalUsers || 0}</span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Total Users</h3>
          <p className="mt-2 text-xs text-gray-500">Across all subscribed organizations</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-8 w-8 text-emerald-600" />
            <span className="text-2xl font-bold text-gray-900">
              {summary?.revenue.totalPaid.toLocaleString() || 0}
            </span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Revenue (Paid)</h3>
          <p className="mt-2 text-xs text-gray-500">
            {summary?.revenue.pendingAmount.toLocaleString() || 0} SAR pending
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
            <span className="text-2xl font-bold text-gray-900">{summary?.alerts.usersOverLimit + summary?.alerts.expiringSoon || 0}</span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Alerts</h3>
          <div className="mt-2 flex gap-2">
            {summary?.alerts.usersOverLimit > 0 && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                {summary.alerts.usersOverLimit} Over Limit
              </span>
            )}
            {summary?.alerts.expiringSoon > 0 && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                {summary.alerts.expiringSoon} Expiring
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Plans</option>
            <option value="ENTERPRISE">Enterprise</option>
            <option value="PREMIUM">Premium</option>
            <option value="STANDARD">Standard</option>
            <option value="BASIC">Basic</option>
          </select>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub) => (
                  <tr key={sub.organizationId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{sub.organizationName}</div>
                        <div className="text-sm text-gray-500">{sub.organizationCode}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPlanColor(sub.plan)}`}>
                        {sub.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(sub.status)}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {sub.users.total} / {sub.users.limit}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${sub.users.percentUsed > 100 ? 'bg-red-600' : sub.users.percentUsed > 80 ? 'bg-amber-600' : 'bg-green-600'}`}
                          style={{ width: `${Math.min(sub.users.percentUsed, 100)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {sub.payments.totalPaid.toLocaleString()} {sub.payments.currency}
                      </div>
                      {sub.payments.pendingAmount > 0 && (
                        <div className="text-xs text-amber-600">
                          {sub.payments.pendingAmount.toLocaleString()} pending
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{sub.contact.email || 'N/A'}</div>
                      <div>{sub.contact.phone || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => router.push(`/fm/admin/subscriptions/${sub.organizationId}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results Count */}
      <div className="mt-4 text-center text-sm text-gray-600">
        Showing {filteredSubs.length} of {subscriptions.length} subscriptions
      </div>
    </div>
  );
}
