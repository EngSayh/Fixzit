import React from &apos;react&apos;;

export default function PreventiveMaintenancePage() {
  const pmSchedules = [
    {
      id: &apos;PM-001&apos;,
      title: &apos;Monthly AC Maintenance&apos;,
      property: &apos;Tower A&apos;,
      frequency: &apos;Monthly&apos;,
      lastDone: &apos;2025-01-15&apos;,
      nextDue: &apos;2025-02-15&apos;,
      status: 'scheduled',
      assigned: &apos;Ahmed Al-Rashid&apos;
    },
    {
      id: &apos;PM-002&apos;,
      title: &apos;Quarterly Elevator Inspection&apos;,
      property: &apos;Tower B&apos;,
      frequency: &apos;Quarterly&apos;,
      lastDone: &apos;2025-01-01&apos;,
      nextDue: &apos;2025-04-01&apos;,
      status: &apos;due&apos;,
      assigned: &apos;Mohammed Al-Saud&apos;
    },
    {
      id: &apos;PM-003&apos;,
      title: &apos;Annual Fire System Check&apos;,
      property: &apos;Villa Complex&apos;,
      frequency: &apos;Annual&apos;,
      lastDone: &apos;2024-12-01&apos;,
      nextDue: &apos;2025-12-01&apos;,
      status: &apos;overdue&apos;,
      assigned: &apos;Omar Al-Fahad&apos;
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled&apos;: return &apos;bg-blue-100 text-blue-800 border-blue-200&apos;;
      case &apos;due&apos;: return &apos;bg-yellow-100 text-yellow-800 border-yellow-200&apos;;
      case &apos;overdue&apos;: return &apos;bg-red-100 text-red-800 border-red-200&apos;;
      case &apos;completed&apos;: return &apos;bg-green-100 text-green-800 border-green-200&apos;;
      default: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fixzit-text)]">Preventive Maintenance</h1>
          <p className="text-[var(--fixzit-text-secondary)]">Schedule and track preventive maintenance activities</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">Import Schedule</button>
          <button className="btn-primary">+ New PM Schedule</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-blue-600">8</p>
            </div>
            <div className="text-blue-400">📅</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Due This Month</p>
              <p className="text-2xl font-bold text-yellow-600">3</p>
            </div>
            <div className="text-yellow-400">⚠️</div>
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
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">15</p>
            </div>
            <div className="text-green-400">✅</div>
          </div>
        </div>
      </div>

      {/* PM Schedule Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">PM Schedules</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search schedules..."
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
            />
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
              <option>All Properties</option>
              <option>Tower A</option>
              <option>Tower B</option>
              <option>Villa Complex</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Done</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Due</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pmSchedules.map(schedule => (
                <tr key={schedule.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{schedule.id}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{schedule.title}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{schedule.property}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{schedule.frequency}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{schedule.lastDone}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{schedule.nextDue}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(schedule.status)}`}>
                      {schedule.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{schedule.assigned}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-900">Edit</button>
                      <button className="text-green-600 hover:text-green-900">Complete</button>
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
            <div className="text-2xl mb-2">📅</div>
            <div className="text-sm font-medium">Schedule PM</div>
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

