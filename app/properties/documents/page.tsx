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
  const propertyOptions = [
    { value: 'all', key: 'properties.filters.allProperties', fallback: 'All Properties' },
    { value: 'tower-a', key: 'properties.filters.towerA', fallback: 'Tower A' },
    { value: 'tower-b', key: 'properties.filters.towerB', fallback: 'Tower B' },
    { value: 'villa-complex', key: 'properties.filters.villaComplex', fallback: 'Villa Complex' },
  ];

  const documentTypeOptions = [
    { value: 'all', key: 'properties.documents.filters.types.all', fallback: 'All Types' },
    { value: 'legal', key: 'properties.documents.filters.types.legal', fallback: 'Legal' },
    { value: 'safety', key: 'properties.documents.filters.types.safety', fallback: 'Safety' },
    { value: 'contract', key: 'properties.documents.filters.types.contract', fallback: 'Contract' },
    { value: 'insurance', key: 'properties.documents.filters.types.insurance', fallback: 'Insurance' },
  ];

  const documentStatusOptions = [
    { value: 'all', key: 'properties.documents.filters.status.all', fallback: 'All Status' },
    { value: 'active', key: 'properties.documents.filters.status.active', fallback: 'Active' },
    { value: 'expiring', key: 'properties.documents.filters.status.expiringSoon', fallback: 'Expiring Soon' },
    { value: 'expired', key: 'properties.documents.filters.status.expired', fallback: 'Expired' },
    { value: 'pending', key: 'properties.documents.filters.status.pendingReview', fallback: 'Pending Review' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-success/10 text-success-foreground border-success/20';
      case 'Expiring Soon': return 'bg-warning/10 text-warning-foreground border-warning/20';
      case 'Expired': return 'bg-destructive/10 text-destructive-foreground border-destructive/20';
      case 'Pending Review': return 'bg-primary/10 text-primary-foreground border-primary/20';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Legal': return 'bg-primary/10 text-primary-foreground border-primary/20';
      case 'Safety': return 'bg-destructive/10 text-destructive-foreground border-destructive/20';
      case 'Contract': return 'bg-success/10 text-success-foreground border-success/20';
      case 'Insurance': return 'bg-secondary/10 text-secondary border-secondary/30';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Property Documents</h1>
          <p className="text-muted-foreground">Manage property documents, certificates, and legal files</p>
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
              <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
              <p className="text-2xl font-bold text-primary">247</p>
            </div>
            <div className="text-primary">📄</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
              <p className="text-2xl font-bold text-accent">8</p>
            </div>
            <div className="text-accent">⚠️</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Expired</p>
              <p className="text-2xl font-bold text-destructive">3</p>
            </div>
            <div className="text-[hsl(var(--destructive)) / 0.1]">🔴</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
              <p className="text-2xl font-bold text-[hsl(var(--secondary))]">2.4 GB</p>
            </div>
            <div className="text-secondary">💾</div>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="card">
        <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center">
          <div className="text-muted-foreground mb-4">📎</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Upload Documents</h3>
          <p className="text-muted-foreground mb-4">Drag and drop files here or click to browse</p>
          <button className="px-6 py-3 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-colors">
            Choose Files
          </button>
          <p className="text-sm text-muted-foreground mt-2">Supports PDF, DOC, JPG up to 10MB each</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent">
              {propertyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key, option.fallback)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent">
              {documentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key, option.fallback)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent">
              {documentStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key, option.fallback)}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary">{t('common.filter', 'Filter')}</button>
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
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Document</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Uploaded By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Upload Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Expiry Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-muted">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-muted-foreground me-3">📄</div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{doc.name}</div>
                        <div className="text-sm text-muted-foreground">{doc.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{doc.property}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getTypeColor(doc.type)}`}>
                      {doc.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{doc.uploadedBy}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{doc.uploadDate}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{doc.expiryDate || 'N/A'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{doc.size}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button className="text-primary hover:text-primary">{t('common.view', 'View')}</button>
                      <button className="text-success hover:text-success-foreground">{t('common.download', 'Download')}</button>
                      <button className="text-warning hover:text-warning">{t('common.edit', 'Edit')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expiring Documents Alert */}
      <div className="card border-warning/20 bg-accent/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-accent">⚠️</div>
            <div>
              <h3 className="font-semibold text-accent">Documents Expiring Soon</h3>
              <p className="text-sm text-accent">8 documents will expire within the next 30 days</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-[hsl(var(--accent))] text-white rounded-2xl hover:bg-accent/90 transition-colors">
            Review Now
          </button>
        </div>
      </div>

      {/* Document Categories */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Legal Documents</p>
              <p className="text-2xl font-bold text-primary">45</p>
            </div>
            <div className="text-primary">⚖️</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Safety Certificates</p>
              <p className="text-2xl font-bold text-destructive">23</p>
            </div>
            <div className="text-[hsl(var(--destructive)) / 0.1]">🛡️</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contracts</p>
              <p className="text-2xl font-bold text-success">89</p>
            </div>
            <div className="text-success">📋</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Insurance</p>
              <p className="text-2xl font-bold text-[hsl(var(--secondary))]">12</p>
            </div>
            <div className="text-secondary">🛡️</div>
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
