import React from 'react';

export default function PropertiesInspectionsPage() {
  const inspections = [
    {
      id: 'INSP-001',
      title: 'Monthly Safety Inspection',
      property: 'Tower A',
      inspector: 'Safety Team',
      scheduledDate: '2025-01-25',
      status: 'scheduled',
      type: 'Safety',
      lastInspection: '2024-12-25',
      nextDue: '2025-02-25'
    },
    {
      id: 'INSP-002',
      title: 'Fire System Check',
      property: 'Tower B',
      inspector: 'Fire Safety Dept',
      scheduledDate: '2025-01-23',
      status: 'in-progress',
      type: 'Fire Safety',
      lastInspection: '2024-10-15',
      nextDue: '2025-04-15'
    },
    {
      id: 'INSP-003',
      title: 'HVAC System Inspection',
      property: 'Villa Complex',
      inspector: 'Maintenance Team',
      scheduledDate: '2025-01-20',
      status: 'completed',
      type: 'Mechanical',
      lastInspection: '2024-12-20',
      nextDue: '2025-02-20'
    },
    {
      id: 'INSP-004',
      title: 'Electrical Safety Audit',
      property: 'Tower A',
      inspector: 'Electrical Team',
      scheduledDate: '2025-01-18',
      status: 'overdue',
      type: 'Electrical',
      lastInspection: '2024-11-15',
      nextDue: '2025-05-15'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Safety': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Fire Safety': return 'bg-red-100 text-red-800 border-red-200';
      case 'Mechanical': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Electrical': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fixzit-text)]">Property Inspections</h1>
          <p className="text-[var(--fixzit-text-secondary)]">Schedule and track property inspections and audits</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">Inspection Templates</button>
          <button className="btn-primary">+ Schedule Inspection</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-blue-600">12</p>
            </div>
            <div className="text-blue-400">📅</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">3</p>
            </div>
            <div className="text-yellow-400">🔄</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">45</p>
            </div>
            <div className="text-green-400">✅</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">2</p>
            </div>
            <div className="text-red-400">🔴</div>
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
              <option>Safety</option>
              <option>Fire Safety</option>
              <option>Mechanical</option>
              <option>Electrical</option>
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
              <option>All Status</option>
              <option>Scheduled</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Overdue</option>
            </select>
          </div>
          <button className="btn-primary">Filter</button>
        </div>
      </div>

      {/* Inspections Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Inspection Schedule</h3>
          <div className="flex gap-2">
            <button className="btn-ghost">📄 Export</button>
            <button className="btn-ghost">📊 Reports</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspection ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspector</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Inspection</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Due</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inspections.map(inspection => (
                <tr key={inspection.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inspection.id}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{inspection.title}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{inspection.property}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{inspection.inspector}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{inspection.scheduledDate}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getTypeColor(inspection.type)}`}>
                      {inspection.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{inspection.lastInspection}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{inspection.nextDue}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(inspection.status)}`}>
                      {inspection.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-900">Edit</button>
                      <button className="text-green-600 hover:text-green-900">Start</button>
                      <button className="text-orange-600 hover:text-orange-900">Report</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overdue Inspections Alert */}
      <div className="card border-red-200 bg-red-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-red-400">🔴</div>
            <div>
              <h3 className="font-semibold text-red-800">Overdue Inspections</h3>
              <p className="text-sm text-red-600">2 inspections are overdue and require immediate attention</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            Reschedule Now
          </button>
        </div>
      </div>

      {/* Upcoming Inspections */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Upcoming Inspections</h3>
          <button className="btn-ghost">View Calendar</button>
        </div>
        <div className="space-y-3">
          {inspections.filter(inspection => inspection.status === 'scheduled').map(inspection => (
            <div key={inspection.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-blue-400">📅</div>
                <div>
                  <p className="font-medium text-gray-900">{inspection.title}</p>
                  <p className="text-sm text-gray-600">{inspection.property} • {inspection.scheduledDate}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                  View Details
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
            <div className="text-2xl mb-2">📅</div>
            <div className="text-sm font-medium">Schedule</div>
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
            <div className="text-2xl mb-2">🔧</div>
            <div className="text-sm font-medium">Checklists</div>
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

