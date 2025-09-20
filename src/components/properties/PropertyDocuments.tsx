'use client';

import React, { useState } from 'react';
import { Property, PropertyDocument, DOCUMENT_CATEGORY_CONFIG } from '../../../types/properties';

interface PropertyDocumentsProps {
  property: Property;
}

// Mock document data
const mockDocuments: PropertyDocument[] = [
  {
    id: 'doc-001',
    propertyId: 'prop-001',
    filename: 'lease_agreement_a101.pdf',
    originalName: 'Lease Agreement A101.pdf',
    url: '/documents/lease_agreement_a101.pdf',
    size: 2048576,
    mimeType: 'application/pdf',
    category: 'lease',
    description: 'Lease agreement for unit A101 - Ahmed Al-Rashid',
    isPublic: false,
    uploadedBy: 'user-1',
    orgId: 'org-1',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'doc-002',
    propertyId: 'prop-001',
    filename: 'building_inspection_2024.pdf',
    originalName: 'Building Inspection Report 2024.pdf',
    url: '/documents/building_inspection_2024.pdf',
    size: 5242880,
    mimeType: 'application/pdf',
    category: 'inspection',
    description: 'Annual building safety inspection report',
    isPublic: false,
    uploadedBy: 'user-1',
    orgId: 'org-1',
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-02-01T10:00:00Z'
  },
  {
    id: 'doc-003',
    propertyId: 'prop-001',
    filename: 'floor_plan_tower_a.jpg',
    originalName: 'Floor Plan Tower A.jpg',
    url: '/documents/floor_plan_tower_a.jpg',
    size: 1572864,
    mimeType: 'image/jpeg',
    category: 'floorplan',
    description: 'Architectural floor plan for Tower A',
    isPublic: true,
    uploadedBy: 'user-1',
    orgId: 'org-1',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z'
  },
  {
    id: 'doc-004',
    propertyId: 'prop-001',
    filename: 'insurance_certificate_2024.pdf',
    originalName: 'Insurance Certificate 2024.pdf',
    url: '/documents/insurance_certificate_2024.pdf',
    size: 1048576,
    mimeType: 'application/pdf',
    category: 'insurance',
    description: 'Building insurance certificate valid until Dec 2024',
    isPublic: false,
    uploadedBy: 'user-1',
    orgId: 'org-1',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z'
  },
  {
    id: 'doc-005',
    propertyId: 'prop-001',
    filename: 'property_photos_lobby.jpg',
    originalName: 'Property Photos - Lobby.jpg',
    url: '/documents/property_photos_lobby.jpg',
    size: 3145728,
    mimeType: 'image/jpeg',
    category: 'photo',
    description: 'Professional photos of building lobby area',
    isPublic: true,
    uploadedBy: 'user-1',
    orgId: 'org-1',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z'
  }
];

export default function PropertyDocuments({ property }: PropertyDocumentsProps) {
  const [documents, setDocuments] = useState<PropertyDocument[]>(mockDocuments);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState('date');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const filteredDocuments = documents.filter(doc => {
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesSearch = searchTerm === '' ||
      doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.originalName.localeCompare(b.originalName);
      case 'date':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'size':
        return b.size - a.size;
      case 'category':
        return a.category.localeCompare(b.category);
      default:
        return 0;
    }
  });

  const getCategoryStats = () => {
    return documents.reduce((acc, doc) => {
      acc[doc.category] = (acc[doc.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    return '📁';
  };

  const categoryStats = getCategoryStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Documents ({documents.length})</h2>
          <p className="text-sm text-gray-600">Manage property documents, photos, and certificates</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#005098] flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload Documents
        </button>
      </div>

      {/* Category Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {Object.entries(DOCUMENT_CATEGORY_CONFIG).map(([category, config]) => (
          <div key={category} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">{config.icon}</div>
            <div className="text-lg font-bold text-gray-900">{categoryStats[category] || 0}</div>
            <div className="text-xs text-gray-600">{config.label}</div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search documents by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
            >
              <option value="all">All Categories</option>
              {Object.entries(DOCUMENT_CATEGORY_CONFIG).map(([category, config]) => (
                <option key={category} value={category}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
            >
              <option value="date">Upload Date</option>
              <option value="name">Name</option>
              <option value="size">File Size</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents List */}
      {sortedDocuments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {searchTerm ? 'No documents match your search criteria.' : 'This property doesn\'t have any documents yet.'}
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#005098]"
          >
            Upload First Document
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {sortedDocuments.map((document) => {
              const categoryConfig = DOCUMENT_CATEGORY_CONFIG[document.category];
              return (
                <div key={document.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    {/* File Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                        {getFileIcon(document.mimeType)}
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {document.originalName}
                          </h3>
                          {document.description && (
                            <p className="text-sm text-gray-600 mt-1">{document.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className={`px-2 py-1 rounded-full ${categoryConfig.color}`}>
                              {categoryConfig.icon} {categoryConfig.label}
                            </span>
                            <span>{formatFileSize(document.size)}</span>
                            <span>{new Date(document.createdAt).toLocaleDateString()}</span>
                            {document.isPublic && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                Public
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          <button className="p-2 text-gray-400 hover:text-[#0061A8] rounded-lg hover:bg-gray-100">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button className="p-2 text-gray-400 hover:text-[#0061A8] rounded-lg hover:bg-gray-100">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button className="p-2 text-gray-400 hover:text-[#0061A8] rounded-lg hover:bg-gray-100">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Documents</h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop files here, or click to browse
              </p>
              <button className="text-sm text-[#0061A8] hover:text-[#005098] font-medium">
                Choose Files
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]">
                  {Object.entries(DOCUMENT_CATEGORY_CONFIG).map(([category, config]) => (
                    <option key={category} value={category}>{config.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
                  rows={3}
                  placeholder="Optional description for the document..."
                />
              </div>
              <div className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <label className="text-sm text-gray-700">Make this document publicly visible</label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUpload(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowUpload(false)}
                className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#005098]"
              >
                Upload Documents
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}