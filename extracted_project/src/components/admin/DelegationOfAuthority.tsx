'use client';

import { useState, useEffect } from 'react';
import { Shield, Users, DollarSign, Clock, CheckCircle, AlertCircle, Plus, Search } from 'lucide-react';

interface AuthorityMatrix {
  id: string;
  roleId: string;
  roleName: string;
  category: string;
  subcategory: string;
  spendingLimit: number;
  approvalLevel: number;
  requiresApproval: boolean;
  description: string;
  isActive: boolean;
}

interface ApprovalRequest {
  id: string;
  type: string;
  title: string;
  description: string;
  requestedAmount?: number;
  requesterName: string;
  currentLevel: number;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt: string;
}

export default function DelegationOfAuthority({ orgId }: { orgId: string }) {
  const [activeView, setActiveView] = useState('matrix');
  const [authorityMatrix, setAuthorityMatrix] = useState<AuthorityMatrix[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAuthorityData();
  }, [orgId]);

  const fetchAuthorityData = async () => {
    try {
      setLoading(true);
      
      // Fetch from API with search parameter
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
      const [matrixResponse, requestsResponse] = await Promise.all([
        fetch(`/api/admin/authority-matrix?${searchParam}`),
        fetch(`/api/admin/approval-requests`)
      ]);

      if (!matrixResponse.ok || !requestsResponse.ok) {
        throw new Error('Failed to fetch authority data');
      }

      const matrixData = await matrixResponse.json();
      const requestsData = await requestsResponse.json();

      setAuthorityMatrix(matrixData);
      setApprovalRequests(requestsData);

    } catch (error) {
      console.error('Error fetching authority data:', error);
      setAuthorityMatrix([]);
      setApprovalRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Trigger search when search term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAuthorityData();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      approved: 'text-green-600 bg-green-50 border-green-200',
      rejected: 'text-red-600 bg-red-50 border-red-200',
      cancelled: 'text-gray-600 bg-gray-50 border-gray-200'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-gray-600 bg-gray-50',
      normal: 'text-blue-600 bg-blue-50',
      high: 'text-orange-600 bg-orange-50',
      urgent: 'text-red-600 bg-red-50'
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredMatrix = authorityMatrix.filter(item =>
    item.roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRequests = approvalRequests.filter(request =>
    request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.type.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h2 className="text-2xl font-bold text-gray-900">Delegation of Authority</h2>
            <p className="text-gray-600">Authority matrix and approval workflow management</p>
          </div>
          <div className="flex space-x-3">
            <button className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#004d86] transition-colors flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              New Authority Rule
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveView('matrix')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'matrix'
                ? 'bg-white text-[#0061A8] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Authority Matrix
          </button>
          <button
            onClick={() => setActiveView('requests')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'requests'
                ? 'bg-white text-[#0061A8] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Approval Requests ({approvalRequests.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveView('workflow')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'workflow'
                ? 'bg-white text-[#0061A8] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Workflow Designer
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={`Search ${activeView === 'matrix' ? 'authority matrix' : 'approval requests'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
          />
        </div>
      </div>

      {/* Content based on active view */}
      {activeView === 'matrix' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Authority Matrix</h3>
            <p className="text-gray-600">Role-based spending limits and approval requirements</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role & Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spending Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approval Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requirements
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMatrix.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Shield className="w-5 h-5 text-[#0061A8] mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{rule.roleName}</div>
                          <div className="text-sm text-gray-500">{rule.category} • {rule.subcategory}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(rule.spendingLimit)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Level {rule.approvalLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rule.requiresApproval ? (
                        <span className="flex items-center text-orange-600">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Approval Required
                        </span>
                      ) : (
                        <span className="flex items-center text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Self-Authorized
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'requests' && (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <div className="mr-4">
                      {request.type === 'expense' && <DollarSign className="w-6 h-6 text-green-600" />}
                      {request.type === 'purchase' && <Package className="w-6 h-6 text-blue-600" />}
                      {request.type === 'contract' && <FileText className="w-6 h-6 text-purple-600" />}
                      {request.type === 'hr_action' && <Users className="w-6 h-6 text-orange-600" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                      <p className="text-gray-600">Requested by {request.requesterName}</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{request.description}</p>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    {request.requestedAmount && (
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        {formatCurrency(request.requestedAmount)}
                      </div>
                    )}
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      Level {request.currentLevel}
                    </div>
                    {request.dueDate && (
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Due {formatDate(request.dueDate)}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                    {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                  </span>
                  
                  {request.status === 'pending' && (
                    <div className="flex space-x-2 mt-3">
                      <button className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors">
                        Approve
                      </button>
                      <button className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {filteredRequests.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No approval requests found</h3>
              <p className="text-gray-600">All approval requests have been processed or no requests match your search.</p>
            </div>
          )}
        </div>
      )}

      {activeView === 'workflow' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Workflow Designer</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Design custom approval workflows with drag-and-drop interface. Configure approval steps, conditions, and routing rules.
            </p>
            <button className="bg-[#0061A8] text-white px-6 py-3 rounded-lg hover:bg-[#004d86] transition-colors">
              Launch Workflow Designer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}