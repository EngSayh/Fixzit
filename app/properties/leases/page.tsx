import React from &apos;react&apos;;

export default function PropertiesLeasesPage() {
  const leases = [
    {
      id: &apos;L-001&apos;,
      unit: &apos;Tower A / 1204&apos;,
      tenant: &apos;John Smith&apos;,
      type: &apos;Residential&apos;,
      startDate: &apos;2024-01-01&apos;,
      endDate: &apos;2025-12-31&apos;,
      monthlyRent: &apos;SAR 8,500&apos;,
      status: &apos;Active&apos;,
      securityDeposit: &apos;SAR 17,000&apos;,
      paymentStatus: &apos;Paid&apos;
    },
    {
      id: &apos;L-002&apos;,
      unit: &apos;Tower B / 901&apos;,
      tenant: &apos;Sarah Johnson&apos;,
      type: &apos;Residential&apos;,
      startDate: &apos;2024-03-15&apos;,
      endDate: &apos;2025-03-14&apos;,
      monthlyRent: &apos;SAR 12,000&apos;,
      status: &apos;Active&apos;,
      securityDeposit: &apos;SAR 24,000&apos;,
      paymentStatus: &apos;Paid&apos;
    },
    {
      id: &apos;L-003&apos;,
      unit: &apos;Villa 9&apos;,
      tenant: &apos;Ahmed Al-Rashid&apos;,
      type: &apos;Residential&apos;,
      startDate: &apos;2024-06-01&apos;,
      endDate: &apos;2025-05-31&apos;,
      monthlyRent: &apos;SAR 25,000&apos;,
      status: &apos;Expiring Soon&apos;,
      securityDeposit: &apos;SAR 50,000&apos;,
      paymentStatus: &apos;Paid&apos;
    },
    {
      id: &apos;L-004&apos;,
      unit: &apos;Tower A / 1001&apos;,
      tenant: &apos;Available&apos;,
      type: &apos;Commercial&apos;,
      startDate: null,
      endDate: null,
      monthlyRent: &apos;SAR 15,000&apos;,
      status: &apos;Vacant&apos;,
      securityDeposit: null,
      paymentStatus: &apos;N/A&apos;
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case &apos;Active&apos;: return &apos;bg-green-100 text-green-800 border-green-200&apos;;
      case &apos;Expiring Soon&apos;: return &apos;bg-yellow-100 text-yellow-800 border-yellow-200&apos;;
      case &apos;Expired&apos;: return &apos;bg-red-100 text-red-800 border-red-200&apos;;
      case &apos;Vacant&apos;: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
      default: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case &apos;Paid&apos;: return &apos;bg-green-100 text-green-800 border-green-200&apos;;
      case &apos;Pending&apos;: return &apos;bg-yellow-100 text-yellow-800 border-yellow-200&apos;;
      case &apos;Overdue&apos;: return &apos;bg-red-100 text-red-800 border-red-200&apos;;
      case &apos;N/A&apos;: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
      default: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fixzit-text)]">Lease Management</h1>
          <p className="text-[var(--fixzit-text-secondary)]">Manage property leases and rental agreements</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">Lease Templates</button>
          <button className="btn-primary">+ New Lease</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Leases</p>
              <p className="text-2xl font-bold text-green-600">142</p>
            </div>
            <div className="text-green-400">📄</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-yellow-600">8</p>
            </div>
            <div className="text-yellow-400">⚠️</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-blue-600">SAR 1.2M</p>
            </div>
            <div className="text-blue-400">💰</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Lease Term</p>
              <p className="text-2xl font-bold text-purple-600">18 months</p>
            </div>
            <div className="text-purple-400">📅</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
              <option>All Properties</option>
              <option>Tower A</option>
              <option>Tower B</option>
              <option>Villa Complex</option>
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
              <option>All Types</option>
              <option>Residential</option>
              <option>Commercial</option>
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
              <option>All Status</option>
              <option>Active</option>
              <option>Expiring Soon</option>
              <option>Expired</option>
              <option>Vacant</option>
            </select>
          </div>
          <button className="btn-primary">Filter</button>
        </div>
      </div>

      {/* Leases Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Lease Overview</h3>
          <div className="flex gap-2">
            <button className="btn-ghost">📄 Export</button>
            <button className="btn-ghost">📊 Analytics</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lease ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Rent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lease Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leases.map(lease => (
                <tr key={lease.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lease.id}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{lease.unit}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{lease.tenant}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{lease.type}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{lease.startDate || 'N/A&apos;}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{lease.endDate || 'N/A&apos;}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{lease.monthlyRent}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(lease.status)}`}>
                      {lease.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPaymentStatusColor(lease.paymentStatus)}`}>
                      {lease.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-900">View</button>
                      <button className="text-green-600 hover:text-green-900">Edit</button>
                      <button className="text-orange-600 hover:text-orange-900">Renew</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Renewals */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Upcoming Renewals</h3>
          <button className="btn-ghost">View All</button>
        </div>
        <div className="space-y-3">
          {leases.filter(lease => lease.status === 'Expiring Soon&apos;).map(lease => (
            <div key={lease.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-yellow-400">⚠️</div>
                <div>
                  <p className="font-medium text-gray-900">{lease.unit}</p>
                  <p className="text-sm text-gray-600">Tenant: {lease.tenant} • Expires: {lease.endDate}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700">
                  Renew
                </button>
                <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">
                  Contact
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📄</div>
            <div className="text-sm font-medium">New Lease</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">🔄</div>
            <div className="text-sm font-medium">Renewals</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-sm font-medium">Rent Collection</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-medium">Templates</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">Reports</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-sm font-medium">Settings</div>
          </button>
        </div>
      </div>
    </div>
  );
}

