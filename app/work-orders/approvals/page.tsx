import React from &apos;react&apos;;

export default function WorkOrderApprovalsPage() {
  const pendingApprovals = [
    {
      id: &apos;WO-1004&apos;,
      title: &apos;Emergency electrical repair&apos;,
      property: &apos;Tower A / 1204&apos;,
      requestedBy: &apos;Ahmed Al-Rashid&apos;,
      requestDate: &apos;2025-01-22&apos;,
      estimatedCost: &apos;SAR 800&apos;,
      priority: &apos;P1&apos;,
      reason: &apos;Urgent safety issue requiring immediate attention&apos;,
      status: &apos;pending&apos;
    },
    {
      id: &apos;WO-1005&apos;,
      title: &apos;HVAC system upgrade&apos;,
      property: &apos;Tower B / Lobby&apos;,
      requestedBy: &apos;Property Manager&apos;,
      requestDate: &apos;2025-01-21&apos;,
      estimatedCost: &apos;SAR 2,500&apos;,
      priority: &apos;P2&apos;,
      reason: &apos;Scheduled upgrade to improve efficiency&apos;,
      status: &apos;pending&apos;
    },
    {
      id: &apos;WO-1006&apos;,
      title: &apos;Painting exterior walls&apos;,
      property: &apos;Villa Complex&apos;,
      requestedBy: &apos;Omar Al-Fahad&apos;,
      requestDate: &apos;2025-01-20&apos;,
      estimatedCost: &apos;SAR 1,200&apos;,
      priority: &apos;P3&apos;,
      reason: &apos;Routine maintenance and aesthetic improvement&apos;,
      status: &apos;under-review&apos;
    }
  ];

  const approvedWorkOrders = [
    {
      id: &apos;WO-1001&apos;,
      title: &apos;AC not cooling&apos;,
      property: &apos;Tower A / 1204&apos;,
      approvedBy: &apos;Admin User&apos;,
      approvalDate: &apos;2025-01-19&apos;,
      estimatedCost: &apos;SAR 150&apos;,
      actualCost: &apos;SAR 145&apos;,
      status: &apos;approved&apos;
    },
    {
      id: &apos;WO-1002&apos;,
      title: &apos;Elevator maintenance&apos;,
      property: &apos;Tower B / Lobby&apos;,
      approvedBy: &apos;Admin User&apos;,
      approvalDate: &apos;2025-01-18&apos;,
      estimatedCost: &apos;SAR 300&apos;,
      actualCost: &apos;SAR 285&apos;,
      status: &apos;approved&apos;
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case &apos;pending&apos;: return &apos;bg-yellow-100 text-yellow-800 border-yellow-200&apos;;
      case &apos;approved&apos;: return &apos;bg-green-100 text-green-800 border-green-200&apos;;
      case &apos;rejected&apos;: return &apos;bg-red-100 text-red-800 border-red-200&apos;;
      case &apos;under-review&apos;: return &apos;bg-blue-100 text-blue-800 border-blue-200&apos;;
      default: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case &apos;P1&apos;: return &apos;bg-red-500 text-white&apos;;
      case &apos;P2&apos;: return &apos;bg-orange-500 text-white&apos;;
      case &apos;P3&apos;: return &apos;bg-yellow-500 text-black&apos;;
      case &apos;P4&apos;: return &apos;bg-green-500 text-white&apos;;
      default: return &apos;bg-gray-500 text-white&apos;;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fixzit-text)]">Work Order Approvals</h1>
          <p className="text-[var(--fixzit-text-secondary)]">Review and approve work orders that require authorization</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">Approval Rules</button>
          <button className="btn-primary">📋 Bulk Approve</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-yellow-600">3</p>
            </div>
            <div className="text-yellow-400">⏳</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved Today</p>
              <p className="text-2xl font-bold text-green-600">5</p>
            </div>
            <div className="text-green-400">✅</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Approval Time</p>
              <p className="text-2xl font-bold text-blue-600">2.3h</p>
            </div>
            <div className="text-blue-400">⏱️</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Approved</p>
              <p className="text-2xl font-bold text-purple-600">247</p>
            </div>
            <div className="text-purple-400">📊</div>
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Pending Approvals</h3>
          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
            {pendingApprovals.length} pending
          </span>
        </div>

        <div className="space-y-4">
          {pendingApprovals.map(item => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-gray-900">{item.id}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-600 mb-2">{item.property}</p>
                  <p className="text-sm text-gray-500 mb-3">{item.reason}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span><strong>Requested by:</strong> {item.requestedBy}</span>
                    <span><strong>Date:</strong> {item.requestDate}</span>
                    <span><strong>Estimated Cost:</strong> {item.estimatedCost}</span>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    Approve
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    Reject
                  </button>
                  <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                    Review
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Approvals */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Approvals</h3>
          <button className="btn-ghost">View All</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WO ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimated Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {approvedWorkOrders.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.id}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.title}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.property}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.approvedBy}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.approvalDate}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.estimatedCost}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.actualCost}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
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
            <div className="text-2xl mb-2">✅</div>
            <div className="text-sm font-medium">Bulk Approve</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-medium">Approval Rules</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">Reports</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">🔄</div>
            <div className="text-sm font-medium">Workflow</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-sm font-medium">Settings</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📤</div>
            <div className="text-sm font-medium">Export</div>
          </button>
        </div>
      </div>
    </div>
  );
}

