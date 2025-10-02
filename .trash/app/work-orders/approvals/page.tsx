import React from 'react';

export default function WorkOrderApprovalsPage() {
  const pendingApprovals = [
    {
      id: 'WO-1004',
      title: 'Emergency electrical repair',
      property: 'Tower A / 1204',
      requestedBy: 'Ahmed Al-Rashid',
      requestDate: '2025-01-22',
      estimatedCost: 'SAR 800',
      priority: 'P1',
      reason: 'Urgent safety issue requiring immediate attention',
      status: 'pending'
    },
    {
      id: 'WO-1005',
      title: 'HVAC system upgrade',
      property: 'Tower B / Lobby',
      requestedBy: 'Property Manager',
      requestDate: '2025-01-21',
      estimatedCost: 'SAR 2,500',
      priority: 'P2',
      reason: 'Scheduled upgrade to improve efficiency',
      status: 'pending'
    },
    {
      id: 'WO-1006',
      title: 'Painting exterior walls',
      property: 'Villa Complex',
      requestedBy: 'Omar Al-Fahad',
      requestDate: '2025-01-20',
      estimatedCost: 'SAR 1,200',
      priority: 'P3',
      reason: 'Routine maintenance and aesthetic improvement',
      status: 'under-review'
    }
  ];

  const approvedWorkOrders = [
    {
      id: 'WO-1001',
      title: 'AC not cooling',
      property: 'Tower A / 1204',
      approvedBy: 'Admin User',
      approvalDate: '2025-01-19',
      estimatedCost: 'SAR 150',
      actualCost: 'SAR 145',
      status: 'approved'
    },
    {
      id: 'WO-1002',
      title: 'Elevator maintenance',
      property: 'Tower B / Lobby',
      approvedBy: 'Admin User',
      approvalDate: '2025-01-18',
      estimatedCost: 'SAR 300',
      actualCost: 'SAR 285',
      status: 'approved'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'under-review': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P1': return 'bg-red-500 text-white';
      case 'P2': return 'bg-orange-500 text-white';
      case 'P3': return 'bg-yellow-500 text-black';
      case 'P4': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
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

