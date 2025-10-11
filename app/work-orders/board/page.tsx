import React from 'react';

export default function WorkOrdersBoardPage() {
  const workOrders = [
    {
      id: 'WO-1001',
      title: 'AC not cooling',
      property: 'Tower A / 1204',
      priority: 'P2',
      status: 'in-progress',
      assignee: 'Ahmed Al-Rashid',
      dueDate: '2025-01-25',
      daysOpen: 3
    },
    {
      id: 'WO-1002',
      title: 'Leak in ceiling',
      property: 'Villa 9',
      priority: 'P1',
      status: 'pending',
      assignee: 'Mohammed Al-Saud',
      dueDate: '2025-01-24',
      daysOpen: 1
    },
    {
      id: 'WO-1003',
      title: 'Elevator maintenance',
      property: 'Tower B / Lobby',
      priority: 'P3',
      status: 'scheduled',
      assignee: 'Omar Al-Fahad',
      dueDate: '2025-01-26',
      daysOpen: 7
    }
  ];

  
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
          <h1 className="text-2xl font-bold text-[var(--fixzit-text)]">Work Orders Board</h1>
          <p className="text-[var(--fixzit-text-secondary)]">Track and assign work orders across all properties</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">Filter</button>
          <button className="btn-primary">+ New Work Order</button>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pending */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Pending</h3>
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">2</span>
          </div>
          <div className="space-y-3">
            {workOrders.filter(wo => wo.status === 'pending').map(wo => (
              <div key={wo.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{wo.id}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(wo.priority)}`}>
                    {wo.priority}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800 mb-1">{wo.title}</p>
                <p className="text-xs text-gray-600">{wo.property}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">{wo.assignee}</span>
                  <span className="text-xs text-red-600">{wo.daysOpen}d</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* In Progress */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">In Progress</h3>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">1</span>
          </div>
          <div className="space-y-3">
            {workOrders.filter(wo => wo.status === 'in-progress').map(wo => (
              <div key={wo.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{wo.id}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(wo.priority)}`}>
                    {wo.priority}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800 mb-1">{wo.title}</p>
                <p className="text-xs text-gray-600">{wo.property}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">{wo.assignee}</span>
                  <span className="text-xs text-blue-600">{wo.daysOpen}d</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scheduled */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Scheduled</h3>
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">1</span>
          </div>
          <div className="space-y-3">
            {workOrders.filter(wo => wo.status === 'scheduled').map(wo => (
              <div key={wo.id} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{wo.id}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(wo.priority)}`}>
                    {wo.priority}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800 mb-1">{wo.title}</p>
                <p className="text-xs text-gray-600">{wo.property}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">{wo.assignee}</span>
                  <span className="text-xs text-purple-600">{wo.daysOpen}d</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completed */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Completed</h3>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">0</span>
          </div>
          <div className="text-center py-8">
            <div className="text-green-400 mb-2">✅</div>
            <p className="text-sm text-gray-600">No completed work orders</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📝</div>
            <div className="text-sm font-medium">Create WO</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">👥</div>
            <div className="text-sm font-medium">Assign Tech</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📅</div>
            <div className="text-sm font-medium">Schedule</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">Reports</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-sm font-medium">Search</div>
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

