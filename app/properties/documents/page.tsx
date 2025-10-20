'use client';

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

export default function PropertiesDocumentsPage() {
  const { t } = useTranslation();
  const documents = [
    {
      id: 'DOC-001',
      name: 'Tower A - Building Permit',
      type: 'Legal',
      property: 'Tower A',
      uploadedBy: 'Admin User',
      uploadDate: '2024-01-15',
      expiryDate: '2026-01-15',
      status: 'Active',
      size: '2.4 MB'
    },
    {
      id: 'DOC-002',
      name: 'Fire Safety Certificate',
      type: 'Safety',
      property: 'Tower B',
      uploadedBy: 'Safety Officer',
      uploadDate: '2024-01-10',
      expiryDate: '2025-01-10',
      status: 'Expiring Soon',
      size: '1.8 MB'
    },
    {
      id: 'DOC-003',
      name: 'Lease Agreement - Unit 1204',
      type: 'Contract',
      property: 'Tower A',
      uploadedBy: 'Property Manager',
      uploadDate: '2024-01-05',
      expiryDate: '2025-12-31',
      status: 'Active',
      size: '3.2 MB'
    },
    {
      id: 'DOC-004',
      name: 'Insurance Policy - All Properties',
      type: 'Insurance',
      property: 'All Properties',
      uploadedBy: 'Admin User',
      uploadDate: '2023-12-20',
      expiryDate: '2024-12-20',
      status: 'Expired',
      size: '5.1 MB'
    },
    {
      id: 'DOC-005',
      name: 'Maintenance Contract - Elevators',
      type: 'Contract',
      property: 'Tower A & B',
      uploadedBy: 'Maintenance Manager',
      uploadDate: '2024-01-01',
      expiryDate: '2025-12-31',
      status: 'Active',
      size: '1.5 MB'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 border-green-200';
      case 'Expiring Soon': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'Pending Review': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Legal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Safety': return 'bg-red-100 text-red-800 border-red-200';
      case 'Contract': return 'bg-green-100 text-green-800 border-green-200';
      case 'Insurance': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
              <p className="text-2xl font-bold text-[var(--fixzit-primary)]">247</p>
            </div>
            <div className="text-[var(--fixzit-primary-lighter)]">📄</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-[var(--fixzit-accent)]">8</p>
            </div>
            <div className="text-[var(--fixzit-accent-lighter)]">⚠️</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-[var(--fixzit-danger)]">3</p>
            </div>
            <div className="text-[var(--fixzit-danger-lighter)]">🔴</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Storage Used</p>
              <p className="text-2xl font-bold text-[var(--fixzit-secondary)]">2.4 GB</p>
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
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{doc.expiryDate || 'N/A'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{doc.size}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button className="text-[var(--fixzit-primary)] hover:text-[var(--fixzit-primary-darkest)]">{t('common.view', 'View')}</button>
                      <button className="text-[var(--fixzit-success)] hover:text-[var(--fixzit-success-darkest)]">{t('common.download', 'Download')}</button>
                      <button className="text-orange-600 hover:text-orange-900">{t('common.edit', 'Edit')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expiring Documents Alert */}
      <div className="card border-yellow-200 bg-[var(--fixzit-accent-lightest)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-[var(--fixzit-accent-lighter)]">⚠️</div>
            <div>
              <h3 className="font-semibold text-[var(--fixzit-accent-darker)]">Documents Expiring Soon</h3>
              <p className="text-sm text-[var(--fixzit-accent)]">8 documents will expire within the next 30 days</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-[var(--fixzit-accent)] text-white rounded-lg hover:bg-[var(--fixzit-accent-dark)] transition-colors">
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
              <p className="text-2xl font-bold text-[var(--fixzit-primary)]">45</p>
            </div>
            <div className="text-[var(--fixzit-primary-lighter)]">⚖️</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Safety Certificates</p>
              <p className="text-2xl font-bold text-[var(--fixzit-danger)]">23</p>
            </div>
            <div className="text-[var(--fixzit-danger-lighter)]">🛡️</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Contracts</p>
              <p className="text-2xl font-bold text-[var(--fixzit-success)]">89</p>
            </div>
            <div className="text-[var(--fixzit-success-lighter)]">📋</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Insurance</p>
              <p className="text-2xl font-bold text-[var(--fixzit-secondary)]">12</p>
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
            <div className="text-sm font-medium">{t('common.upload', 'Upload')}</div>
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

