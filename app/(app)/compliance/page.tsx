'use client';

import { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, Shield, FileCheck, Download, Upload, Plus, Search, Filter, CheckCircle, XCircle, Clock, FileText, Building2, User, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';

interface ComplianceDocument {
  _id: string;
  title: string;
  type: 'license' | 'permit' | 'certificate' | 'insurance' | 'inspection' | 'audit';
  category: string;
  propertyId: string;
  propertyName: string;
  issueDate: string;
  expiryDate: string;
  status: 'valid' | 'expiring' | 'expired' | 'pending';
  documentUrl: string;
  issuingAuthority: string;
  referenceNumber: string;
  lastInspectionDate?: string;
  nextInspectionDate?: string;
  complianceScore: number;
  violations: number;
  notes: string;
  attachments: string[];
  reminders: {
    days: number;
    sent: boolean;
    sentDate?: string;
  }[];
  auditTrail: {
    action: string;
    user: string;
    date: string;
    details: string;
  }[];
}

interface ComplianceStats {
  totalDocuments: number;
  validDocuments: number;
  expiringDocuments: number;
  expiredDocuments: number;
  pendingRenewals: number;
  complianceRate: number;
  upcomingInspections: number;
  openViolations: number;
}

interface Violation {
  _id: string;
  documentId: string;
  propertyId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  dateReported: string;
  dueDate: string;
  status: 'open' | 'in_progress' | 'resolved' | 'overdue';
  assignedTo: string;
  resolutionNotes?: string;
  resolvedDate?: string;
  fineAmount?: number;
}

export default function CompliancePage() {
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [stats, setStats] = useState<ComplianceStats>({
    totalDocuments: 0,
    validDocuments: 0,
    expiringDocuments: 0,
    expiredDocuments: 0,
    pendingRenewals: 0,
    complianceRate: 0,
    upcomingInspections: 0,
    openViolations: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<ComplianceDocument | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'documents' | 'violations' | 'calendar' | 'reports'>('documents');

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch compliance documents
      const docsResponse = await fetch('/api/compliance/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch violations
      const violationsResponse = await fetch('/api/compliance/violations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch stats
      const statsResponse = await fetch('/api/compliance/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (docsResponse.ok && violationsResponse.ok && statsResponse.ok) {
        const docsData = await docsResponse.json();
        const violationsData = await violationsResponse.json();
        const statsData = await statsResponse.json();
        
        setDocuments(docsData.data || []);
        setViolations(violationsData.data || []);
        setStats(statsData.data || stats);
      }
    } catch (error) {
      console.error('Error fetching compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async (formData: FormData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/compliance/documents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        await fetchComplianceData();
        setShowUploadModal(false);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
    }
  };

  const handleRenewDocument = async (documentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/compliance/documents/${documentId}/renew`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchComplianceData();
      }
    } catch (error) {
      console.error('Error renewing document:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-600 bg-green-50';
      case 'expiring': return 'text-yellow-600 bg-yellow-50';
      case 'expired': return 'text-red-600 bg-red-50';
      case 'pending': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesFilter = filter === 'all' || doc.status === filter;
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Management</h1>
          <p className="text-gray-600 mt-1">Monitor regulatory compliance and documentation</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 flex items-center space-x-2"
        >
          <Upload className="h-5 w-5" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Compliance Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.complianceRate}%</p>
              <div className="flex items-center mt-2 text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-sm">+2.5% from last month</span>
              </div>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Valid Documents</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.validDocuments}</p>
              <p className="text-sm text-gray-500 mt-2">of {stats.totalDocuments} total</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <FileCheck className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.expiringDocuments}</p>
              <p className="text-sm text-gray-500 mt-2">Next 30 days</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-xl">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open Violations</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.openViolations}</p>
              <p className="text-sm text-gray-500 mt-2">Requires attention</p>
            </div>
            <div className="bg-red-100 p-3 rounded-xl">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            {(['documents', 'violations', 'calendar', 'reports'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'documents' && (
            <>
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Documents</option>
                  <option value="valid">Valid</option>
                  <option value="expiring">Expiring Soon</option>
                  <option value="expired">Expired</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Documents List */}
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading compliance documents...</p>
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No documents found</p>
                  </div>
                ) : (
                  filteredDocuments.map((doc) => (
                    <div
                      key={doc._id}
                      className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-semibold text-gray-900">{doc.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                              {doc.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-600">
                              <Building2 className="inline h-4 w-4 mr-1" />
                              {doc.propertyName} • {doc.category}
                            </p>
                            <p className="text-sm text-gray-600">
                              <Calendar className="inline h-4 w-4 mr-1" />
                              Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              <Shield className="inline h-4 w-4 mr-1" />
                              Compliance Score: {doc.complianceScore}%
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenewDocument(doc._id);
                            }}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            Renew
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(doc.documentUrl, '_blank');
                            }}
                            className="text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === 'violations' && (
            <div className="space-y-4">
              {violations.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No violations found. Great job!</p>
                </div>
              ) : (
                violations.map((violation) => (
                  <div
                    key={violation._id}
                    className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900">{violation.type}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(violation.severity)}`}>
                            {violation.severity.toUpperCase()}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            violation.status === 'resolved' ? 'bg-green-50 text-green-600' :
                            violation.status === 'overdue' ? 'bg-red-50 text-red-600' :
                            'bg-yellow-50 text-yellow-600'
                          }`}>
                            {violation.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="mt-2 text-gray-600">{violation.description}</p>
                        <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                          <span>
                            <Calendar className="inline h-4 w-4 mr-1" />
                            Due: {new Date(violation.dueDate).toLocaleDateString()}
                          </span>
                          <span>
                            <User className="inline h-4 w-4 mr-1" />
                            {violation.assignedTo}
                          </span>
                          {violation.fineAmount && (
                            <span className="text-red-600 font-semibold">
                              Fine: ${violation.fineAmount}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Compliance calendar view coming soon</p>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Compliance reports coming soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Upload Compliance Document</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleUploadDocument(formData);
            }}>
              <div className="space-y-4">
                <input
                  type="text"
                  name="title"
                  placeholder="Document Title"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <select
                  name="type"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Type</option>
                  <option value="license">License</option>
                  <option value="permit">Permit</option>
                  <option value="certificate">Certificate</option>
                  <option value="insurance">Insurance</option>
                  <option value="inspection">Inspection</option>
                  <option value="audit">Audit</option>
                </select>
                <input
                  type="file"
                  name="document"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="date"
                  name="expiryDate"
                  placeholder="Expiry Date"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}