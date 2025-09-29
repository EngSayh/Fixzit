'use client';

import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';

export default function DashboardPage() {
  const stats = [
    { label: 'Total Properties', value: '42', icon: Users, color: 'bg-fixzit-blue' },
    { label: 'Open Work Orders', value: '17', icon: TrendingUp, color: 'bg-fixzit-green' },
    { label: 'Monthly Revenue', value: 'SAR 284,500', icon: DollarSign, color: 'bg-fixzit-yellow' },
    { label: 'Occupancy Rate', value: '92%', icon: BarChart3, color: 'bg-fixzit-orange' },
  ];

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, Eng. Sultan</p>
      </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Work Orders */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Recent Work Orders</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">WO-{1000 + i} - AC Maintenance</p>
                      <p className="text-sm text-gray-500">Property Tower A - Unit 301</p>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                      In Progress
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Recent Transactions</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">INV-{2000 + i} - Monthly Rent</p>
                      <p className="text-sm text-gray-500">Tenant: Acme Corp</p>
                    </div>
                    <span className="font-semibold text-fixzit-green">
                      +SAR {(15000 + i * 1000).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}