'use client';

export default function SystemPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Management</h1>
          <p className="text-gray-600">Configure system settings and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
              <input type="text" value="Fixzit Enterprise" className="w-full px-3 py-2 border border-gray-300 rounded-md" readOnly />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Language</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option>English</option>
                <option>Arabic</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Info</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Version</span>
              <span className="text-sm font-medium text-gray-900">2.0.26</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Last Update</span>
              <span className="text-sm font-medium text-gray-900">Jan 12, 2025</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Database Status</span>
              <span className="text-sm font-medium text-[var(--fixzit-success)]">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

