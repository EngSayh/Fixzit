import React from &apos;react&apos;;

export default function PropertiesDocumentsPage() {
  const documents = [
    {
      id: &apos;DOC-001&apos;,
      name: &apos;Tower A - Building Permit&apos;,
      type: &apos;Legal&apos;,
      property: &apos;Tower A&apos;,
      uploadedBy: &apos;Admin User&apos;,
      uploadDate: &apos;2024-01-15&apos;,
      expiryDate: &apos;2026-01-15&apos;,
      status: &apos;Active&apos;,
      size: &apos;2.4 MB&apos;
    },
    {
      id: &apos;DOC-002&apos;,
      name: &apos;Fire Safety Certificate&apos;,
      type: &apos;Safety&apos;,
      property: &apos;Tower B&apos;,
      uploadedBy: &apos;Safety Officer&apos;,
      uploadDate: &apos;2024-01-10&apos;,
      expiryDate: &apos;2025-01-10&apos;,
      status: &apos;Expiring Soon&apos;,
      size: &apos;1.8 MB&apos;
    },
    {
      id: &apos;DOC-003&apos;,
      name: &apos;Lease Agreement - Unit 1204&apos;,
      type: &apos;Contract&apos;,
      property: &apos;Tower A&apos;,
      uploadedBy: &apos;Property Manager&apos;,
      uploadDate: &apos;2024-01-05&apos;,
      expiryDate: &apos;2025-12-31&apos;,
      status: &apos;Active&apos;,
      size: &apos;3.2 MB&apos;
    },
    {
      id: &apos;DOC-004&apos;,
      name: &apos;Insurance Policy - All Properties&apos;,
      type: &apos;Insurance&apos;,
      property: &apos;All Properties&apos;,
      uploadedBy: &apos;Admin User&apos;,
      uploadDate: &apos;2023-12-20&apos;,
      expiryDate: &apos;2024-12-20&apos;,
      status: &apos;Expired&apos;,
      size: &apos;5.1 MB&apos;
    },
    {
      id: &apos;DOC-005&apos;,
      name: &apos;Maintenance Contract - Elevators&apos;,
      type: &apos;Contract&apos;,
      property: &apos;Tower A & B&apos;,
      uploadedBy: &apos;Maintenance Manager&apos;,
      uploadDate: &apos;2024-01-01&apos;,
      expiryDate: &apos;2025-12-31&apos;,
      status: &apos;Active&apos;,
      size: &apos;1.5 MB&apos;
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case &apos;Active&apos;: return &apos;bg-green-100 text-green-800 border-green-200&apos;;
      case &apos;Expiring Soon&apos;: return &apos;bg-yellow-100 text-yellow-800 border-yellow-200&apos;;
      case &apos;Expired&apos;: return &apos;bg-red-100 text-red-800 border-red-200&apos;;
      case &apos;Pending Review&apos;: return &apos;bg-blue-100 text-blue-800 border-blue-200&apos;;
      default: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case &apos;Legal&apos;: return &apos;bg-blue-100 text-blue-800 border-blue-200&apos;;
      case &apos;Safety&apos;: return &apos;bg-red-100 text-red-800 border-red-200&apos;;
      case &apos;Contract&apos;: return &apos;bg-green-100 text-green-800 border-green-200&apos;;
      case &apos;Insurance&apos;: return &apos;bg-purple-100 text-purple-800 border-purple-200&apos;;
      default: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fixzit-text)]">Property Documents</h1>
          <p className="text-[var(--fixzit-text-secondary)]">Manage property documents, certificates, and legal files</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">Document Templates</button>
          <button className="btn-primary">+ Upload Document</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-blue-600">247</p>
            </div>
            <div className="text-blue-400">📄</div>
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
              <p className="text-sm font-medium text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-red-600">3</p>
            </div>
            <div className="text-red-400">🔴</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Storage Used</p>
              <p className="text-2xl font-bold text-purple-600">2.4 GB</p>
            </div>
            <div className="text-purple-400">💾</div>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="card">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="text-gray-400 mb-4">📎</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Documents</h3>
          <p className="text-gray-600 mb-4">Drag and drop files here or click to browse</p>
          <button className="px-6 py-3 bg-[var(--fixzit-blue)] text-white rounded-lg hover:bg-[var(--fixzit-blue)]/90 transition-colors">
            Choose Files
          </button>
          <p className="text-sm text-gray-500 mt-2">Supports PDF, DOC, JPG up to 10MB each</p>
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
              <option>Legal</option>
              <option>Safety</option>
              <option>Contract</option>
              <option>Insurance</option>
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
              <option>All Status</option>
              <option>Active</option>
              <option>Expiring Soon</option>
              <option>Expired</option>
              <option>Pending Review</option>
            </select>
          </div>
          <button className="btn-primary">Filter</button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Document Library</h3>
          <div className="flex gap-2">
            <button className="btn-ghost">📄 Export</button>
            <button className="btn-ghost">📊 Reports</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-gray-400 mr-3">📄</div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                        <div className="text-sm text-gray-500">{doc.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{doc.property}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getTypeColor(doc.type)}`}>
                      {doc.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{doc.uploadedBy}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{doc.uploadDate}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{doc.expiryDate || 'N/A&apos;}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{doc.size}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-900">View</button>
                      <button className="text-green-600 hover:text-green-900">Download</button>
                      <button className="text-orange-600 hover:text-orange-900">Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expiring Documents Alert */}
      <div className="card border-yellow-200 bg-yellow-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-yellow-400">⚠️</div>
            <div>
              <h3 className="font-semibold text-yellow-800">Documents Expiring Soon</h3>
              <p className="text-sm text-yellow-600">8 documents will expire within the next 30 days</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
            Review Now
          </button>
        </div>
      </div>

      {/* Document Categories */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Legal Documents</p>
              <p className="text-2xl font-bold text-blue-600">45</p>
            </div>
            <div className="text-blue-400">⚖️</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Safety Certificates</p>
              <p className="text-2xl font-bold text-red-600">23</p>
            </div>
            <div className="text-red-400">🛡️</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Contracts</p>
              <p className="text-2xl font-bold text-green-600">89</p>
            </div>
            <div className="text-green-400">📋</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Insurance</p>
              <p className="text-2xl font-bold text-purple-600">12</p>
            </div>
            <div className="text-purple-400">🛡️</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📤</div>
            <div className="text-sm font-medium">Upload</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-sm font-medium">Search</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-medium">Templates</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <div className="text-sm font-medium">Expiring</div>
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

