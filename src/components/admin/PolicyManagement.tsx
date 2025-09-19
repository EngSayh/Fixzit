'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Upload, Eye, Edit, Clock, CheckCircle, AlertCircle, Users, Search, Plus, Filter } from 'lucide-react';

interface Policy {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  version: string;
  status: string;
  effectiveDate: string;
  expiryDate?: string;
  reviewDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isRequired: boolean;
  acknowledgmentRate: number;
  totalEmployees: number;
  acknowledgedCount: number;
}

interface PolicyAcknowledgment {
  id: string;
  policyTitle: string;
  userName: string;
  userRole: string;
  version: string;
  acknowledgedAt: string;
  isRequired: boolean;
}

export default function PolicyManagement({ orgId }: { orgId: string }) {
  const [activeView, setActiveView] = useState('policies');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [acknowledgments, setAcknowledgments] = useState<PolicyAcknowledgment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchPolicyData();
  }, [orgId]);

  const fetchPolicyData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from API
      const [policiesResponse, acknowledgementsResponse] = await Promise.all([
        fetch(`/api/admin/policies?orgId=${orgId}`),
        fetch(`/api/admin/policy-acknowledgments?orgId=${orgId}`)
      ]);

      let policiesData: Policy[] = [];
      let acknowledgementsData: PolicyAcknowledgment[] = [];

      if (policiesResponse.ok) {
        policiesData = await policiesResponse.json();
      } else {
        // Fallback data for demo
        policiesData = [
          {
            id: '1',
            title: 'Health and Safety Policy',
            description: 'Comprehensive workplace health and safety guidelines for all employees and contractors',
            category: 'safety',
            subcategory: 'workplace_safety',
            version: '2.1',
            status: 'active',
            effectiveDate: '2024-01-01',
            expiryDate: '2025-12-31',
            reviewDate: '2024-06-01',
            createdBy: 'Sarah Mitchell',
            createdAt: '2023-11-15T08:00:00Z',
            updatedAt: '2024-01-01T10:30:00Z',
            isRequired: true,
            acknowledgmentRate: 87.5,
            totalEmployees: 48,
            acknowledgedCount: 42
          },
          {
            id: '2',
            title: 'Financial Controls and Authorization',
            description: 'Financial approval processes, spending limits, and expenditure controls',
            category: 'financial',
            subcategory: 'approval_controls',
            version: '3.0',
            status: 'active',
            effectiveDate: '2024-03-01',
            reviewDate: '2024-09-01',
            createdBy: 'Ahmed Al-Hassan',
            createdAt: '2024-02-20T14:15:00Z',
            updatedAt: '2024-03-01T09:00:00Z',
            isRequired: true,
            acknowledgmentRate: 93.8,
            totalEmployees: 32,
            acknowledgedCount: 30
          },
          {
            id: '3',
            title: 'Data Privacy and Protection',
            description: 'Guidelines for handling personal and sensitive data in compliance with regulations',
            category: 'compliance',
            subcategory: 'data_protection',
            version: '1.5',
            status: 'active',
            effectiveDate: '2024-05-01',
            expiryDate: '2025-04-30',
            reviewDate: '2024-11-01',
            createdBy: 'Mohammed Rashid',
            createdAt: '2024-04-15T11:20:00Z',
            updatedAt: '2024-05-01T08:45:00Z',
            isRequired: true,
            acknowledgmentRate: 75.0,
            totalEmployees: 48,
            acknowledgedCount: 36
          },
          {
            id: '4',
            title: 'Remote Work Guidelines',
            description: 'Policies and procedures for remote work arrangements and hybrid work models',
            category: 'hr',
            subcategory: 'remote_work',
            version: '1.2',
            status: 'draft',
            effectiveDate: '2025-01-15',
            createdBy: 'Fatima Al-Zahra',
            createdAt: '2024-12-01T16:30:00Z',
            updatedAt: '2024-12-15T13:20:00Z',
            isRequired: false,
            acknowledgmentRate: 0,
            totalEmployees: 0,
            acknowledgedCount: 0
          },
          {
            id: '5',
            title: 'Emergency Response Procedures',
            description: 'Emergency evacuation procedures, crisis management, and business continuity plans',
            category: 'safety',
            subcategory: 'emergency_response',
            version: '2.0',
            status: 'active',
            effectiveDate: '2024-06-01',
            reviewDate: '2024-12-01',
            createdBy: 'Ali Mahmoud',
            createdAt: '2024-05-20T09:15:00Z',
            updatedAt: '2024-06-01T07:30:00Z',
            isRequired: true,
            acknowledgmentRate: 89.6,
            totalEmployees: 48,
            acknowledgedCount: 43
          }
        ];
      }

      if (acknowledgementsResponse.ok) {
        acknowledgementsData = await acknowledgementsResponse.json();
      } else {
        // Fallback data for demo
        acknowledgementsData = [
          {
            id: '1',
            policyTitle: 'Health and Safety Policy',
            userName: 'Ahmed Al-Hassan',
            userRole: 'Property Manager',
            version: '2.1',
            acknowledgedAt: '2024-01-05T14:30:00Z',
            isRequired: true
          },
          {
            id: '2',
            policyTitle: 'Financial Controls and Authorization',
            userName: 'Sarah Mitchell',
            userRole: 'Finance Manager',
            version: '3.0',
            acknowledgedAt: '2024-03-02T09:15:00Z',
            isRequired: true
          },
          {
            id: '3',
            policyTitle: 'Data Privacy and Protection',
            userName: 'Mohammed Rashid',
            userRole: 'IT Coordinator',
            version: '1.5',
            acknowledgedAt: '2024-05-03T11:45:00Z',
            isRequired: true
          },
          {
            id: '4',
            policyTitle: 'Emergency Response Procedures',
            userName: 'Fatima Al-Zahra',
            userRole: 'HR Specialist',
            version: '2.0',
            acknowledgedAt: '2024-06-02T08:20:00Z',
            isRequired: true
          },
          {
            id: '5',
            policyTitle: 'Health and Safety Policy',
            userName: 'Ali Mahmoud',
            userRole: 'Maintenance Supervisor',
            version: '2.1',
            acknowledgedAt: '2024-01-08T16:10:00Z',
            isRequired: true
          }
        ];
      }

      setPolicies(policiesData);
      setAcknowledgments(acknowledgementsData);
      
    } catch (error) {
      console.error('Error fetching policy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'safety', label: 'Safety & Security' },
    { value: 'financial', label: 'Financial' },
    { value: 'hr', label: 'Human Resources' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'operational', label: 'Operations' }
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'text-green-600 bg-green-50 border-green-200',
      draft: 'text-blue-600 bg-blue-50 border-blue-200',
      archived: 'text-gray-600 bg-gray-50 border-gray-200',
      superseded: 'text-yellow-600 bg-yellow-50 border-yellow-200'
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      safety: 'text-red-600 bg-red-50',
      financial: 'text-green-600 bg-green-50',
      hr: 'text-blue-600 bg-blue-50',
      compliance: 'text-purple-600 bg-purple-50',
      operational: 'text-orange-600 bg-orange-50'
    };
    return colors[category as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  const getAcknowledgmentProgress = (policy: Policy) => {
    if (policy.totalEmployees === 0) return 0;
    return Math.round((policy.acknowledgedCount / policy.totalEmployees) * 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         policy.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         policy.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || policy.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredAcknowledgments = acknowledgments.filter(ack =>
    ack.policyTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ack.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ack.userRole.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Policy Management</h2>
            <p className="text-gray-600">Document library and compliance tracking</p>
          </div>
          <div className="flex space-x-3">
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <Upload className="w-4 h-4 mr-2" />
              Import Policies
            </button>
            <button className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#004d86] transition-colors flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Create Policy
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveView('policies')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'policies'
                ? 'bg-white text-[#0061A8] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Policy Library ({policies.length})
          </button>
          <button
            onClick={() => setActiveView('acknowledgments')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'acknowledgments'
                ? 'bg-white text-[#0061A8] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Acknowledgments ({acknowledgments.length})
          </button>
          <button
            onClick={() => setActiveView('compliance')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'compliance'
                ? 'bg-white text-[#0061A8] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Compliance Dashboard
          </button>
        </div>

        {/* Filters */}
        <div className="flex space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search policies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content based on active view */}
      {activeView === 'policies' && (
        <div className="space-y-4">
          {filteredPolicies.map((policy) => (
            <div key={policy.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <FileText className="w-6 h-6 text-[#0061A8] mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{policy.title}</h3>
                      <p className="text-sm text-gray-600">Version {policy.version} • Created by {policy.createdBy}</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{policy.description}</p>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Effective: {formatDate(policy.effectiveDate)}
                    </div>
                    {policy.expiryDate && (
                      <div className="flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        Expires: {formatDate(policy.expiryDate)}
                      </div>
                    )}
                    {policy.reviewDate && (
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        Review: {formatDate(policy.reviewDate)}
                      </div>
                    )}
                  </div>

                  {/* Acknowledgment Progress */}
                  {policy.isRequired && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Acknowledgment Progress</span>
                        <span className="text-sm text-gray-600">
                          {policy.acknowledgedCount} of {policy.totalEmployees} employees
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${getAcknowledgmentProgress(policy)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(policy.category)}`}>
                      {policy.category.charAt(0).toUpperCase() + policy.category.slice(1)}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(policy.status)}`}>
                      {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
                    </span>
                  </div>
                  
                  {policy.isRequired && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Acknowledgment Required
                    </span>
                  )}
                  
                  <div className="flex space-x-2 mt-3">
                    <button className="text-[#0061A8] hover:text-[#004d86] p-2 hover:bg-blue-50 rounded transition-colors" title="View Policy">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-[#0061A8] hover:text-[#004d86] p-2 hover:bg-blue-50 rounded transition-colors" title="Edit Policy">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="text-[#0061A8] hover:text-[#004d86] p-2 hover:bg-blue-50 rounded transition-colors" title="Download Policy">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {filteredPolicies.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No policies found</h3>
              <p className="text-gray-600">No policies match your current search criteria.</p>
            </div>
          )}
        </div>
      )}

      {activeView === 'acknowledgments' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Policy Acknowledgments</h3>
            <p className="text-gray-600">Employee policy acknowledgment history</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Policy & Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acknowledged Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAcknowledgments.map((ack) => (
                  <tr key={ack.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{ack.policyTitle}</div>
                          <div className="text-sm text-gray-500">{ack.userName} • {ack.userRole}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        v{ack.version}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(ack.acknowledgedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Acknowledged
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'compliance' && (
        <div className="space-y-6">
          {/* Compliance Overview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Compliance Dashboard</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 font-semibold">Active Policies</p>
                    <p className="text-2xl font-bold text-green-800">
                      {policies.filter(p => p.status === 'active').length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-600 font-semibold">Pending Review</p>
                    <p className="text-2xl font-bold text-yellow-800">
                      {policies.filter(p => p.reviewDate && new Date(p.reviewDate) <= new Date()).length}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-600 font-semibold">Expired Policies</p>
                    <p className="text-2xl font-bold text-red-800">
                      {policies.filter(p => p.expiryDate && new Date(p.expiryDate) <= new Date()).length}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
              </div>
            </div>

            {/* Acknowledgment Summary */}
            <div className="border-t pt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Acknowledgment Summary by Policy</h4>
              <div className="space-y-4">
                {policies.filter(p => p.isRequired && p.status === 'active').map((policy) => {
                  const progress = getAcknowledgmentProgress(policy);
                  return (
                    <div key={policy.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{policy.title}</h5>
                        <div className="flex items-center mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-4">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                progress >= 90 ? 'bg-green-600' : progress >= 70 ? 'bg-yellow-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 whitespace-nowrap">
                            {policy.acknowledgedCount}/{policy.totalEmployees} ({progress}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}