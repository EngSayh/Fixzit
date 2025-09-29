import React from &apos;react&apos;;

export default function ServiceHistoryPage() {
  const serviceHistory = [
    {
      id: &apos;WO-1001&apos;,
      title: &apos;AC not cooling&apos;,
      property: &apos;Tower A / 1204&apos;,
      technician: &apos;Ahmed Al-Rashid&apos;,
      completionDate: &apos;2025-01-20&apos;,
      duration: &apos;2 hours&apos;,
      cost: &apos;SAR 150&apos;,
      rating: 5,
      status: &apos;completed&apos;
    },
    {
      id: &apos;WO-1002&apos;,
      title: &apos;Elevator maintenance&apos;,
      property: &apos;Tower B / Lobby&apos;,
      technician: &apos;Mohammed Al-Saud&apos;,
      completionDate: &apos;2025-01-18&apos;,
      duration: &apos;4 hours&apos;,
      cost: &apos;SAR 300&apos;,
      rating: 4,
      status: &apos;completed&apos;
    },
    {
      id: &apos;WO-1003&apos;,
      title: &apos;Plumbing repair&apos;,
      property: &apos;Villa 9&apos;,
      technician: &apos;Omar Al-Fahad&apos;,
      completionDate: &apos;2025-01-15&apos;,
      duration: &apos;1.5 hours&apos;,
      cost: &apos;SAR 120&apos;,
      rating: 5,
      status: &apos;completed&apos;
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case &apos;completed&apos;: return &apos;bg-green-100 text-green-800 border-green-200&apos;;
      case &apos;cancelled&apos;: return &apos;bg-red-100 text-red-800 border-red-200&apos;;
      case &apos;pending&apos;: return &apos;bg-yellow-100 text-yellow-800 border-yellow-200&apos;;
      default: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fixzit-text)]">Service History</h1>
          <p className="text-[var(--fixzit-text-secondary)]">View completed work orders and service history</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">Export Report</button>
          <button className="btn-primary">📊 Analytics</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Completed</p>
              <p className="text-2xl font-bold text-green-600">247</p>
            </div>
            <div className="text-green-400">✅</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-blue-600">23</p>
            </div>
            <div className="text-blue-400">📅</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Rating</p>
              <p className="text-2xl font-bold text-yellow-600">4.8</p>
            </div>
            <div className="text-yellow-400">⭐</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-purple-600">SAR 45,230</p>
            </div>
            <div className="text-purple-400">💰</div>
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
              <option>All Technicians</option>
              <option>Ahmed Al-Rashid</option>
              <option>Mohammed Al-Saud</option>
              <option>Omar Al-Fahad</option>
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <input
              type="date"
              placeholder="From Date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
            />
          </div>
          <div className="flex-1 min-w-48">
            <input
              type="date"
              placeholder="To Date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
            />
          </div>
          <button className="btn-primary">Filter</button>
        </div>
      </div>

      {/* Service History Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Service History</h3>
          <div className="flex gap-2">
            <button className="btn-ghost">📄 Export CSV</button>
            <button className="btn-ghost">📊 View Charts</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WO ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {serviceHistory.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.id}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.title}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.property}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.technician}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.completionDate}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.duration}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.cost}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex items-center">
                      <span className="text-yellow-400">⭐</span>
                      <span className="ml-1">{item.rating}/5</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-900">View</button>
                      <button className="text-green-600 hover:text-green-900">Invoice</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">Analytics</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📈</div>
            <div className="text-sm font-medium">Trends</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-sm font-medium">Cost Analysis</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">👥</div>
            <div className="text-sm font-medium">Tech Performance</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📄</div>
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

