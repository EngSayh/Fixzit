'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, CheckCircle, AlertTriangle, XCircle, FileText, 
  Calendar, Download, Upload, Filter, Search, TrendingUp,
  Building2, Users, ClipboardCheck, Award
} from 'lucide-react';
import { useTranslation } from '../../../contexts/I18nContext';

interface ComplianceItem {
  id: string;
  title: string;
  category: string;
  status: 'compliant' | 'non-compliant' | 'pending' | 'expired';
  dueDate: string;
  lastChecked: string;
  assignee: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  documents: number;
  completion: number;
}

export default function CompliancePage() {
  const { t } = useTranslation();
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Mock data
  useEffect(() => {
    const mockItems: ComplianceItem[] = [
      {
        id: 'COMP-001',
        title: 'Fire Safety Inspection',
        category: 'Safety',
        status: 'compliant',
        dueDate: '2025-03-15',
        lastChecked: '2024-12-15',
        assignee: 'Safety Team',
        priority: 'high',
        documents: 5,
        completion: 100
      },
      {
        id: 'COMP-002',
        title: 'Building Permit Renewal',
        category: 'Permits',
        status: 'pending',
        dueDate: '2025-02-01',
        lastChecked: '2024-11-30',
        assignee: 'Legal Department',
        priority: 'critical',
        documents: 3,
        completion: 75
      },
      {
        id: 'COMP-003',
        title: 'Environmental Audit',
        category: 'Environmental',
        status: 'compliant',
        dueDate: '2025-06-30',
        lastChecked: '2024-12-30',
        assignee: 'Environmental Team',
        priority: 'medium',
        documents: 8,
        completion: 100
      },
      {
        id: 'COMP-004',
        title: 'Health & Safety Training',
        category: 'Training',
        status: 'non-compliant',
        dueDate: '2025-01-31',
        lastChecked: '2024-10-15',
        assignee: 'HR Department',
        priority: 'high',
        documents: 2,
        completion: 45
      },
      {
        id: 'COMP-005',
        title: 'Insurance Policy Review',
        category: 'Insurance',
        status: 'expired',
        dueDate: '2024-12-31',
        lastChecked: '2024-06-01',
        assignee: 'Finance Team',
        priority: 'critical',
        documents: 4,
        completion: 0
      }
    ];

    setTimeout(() => {
      setComplianceItems(mockItems);
      setLoading(false);
    }, 1000);
  }, []);

  const categories = [
    { id: 'all', name: 'All Categories', icon: Shield },
    { id: 'safety', name: 'Safety', icon: AlertTriangle },
    { id: 'permits', name: 'Permits', icon: FileText },
    { id: 'environmental', name: 'Environmental', icon: Building2 },
    { id: 'training', name: 'Training', icon: Users },
    { id: 'insurance', name: 'Insurance', icon: Award }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-100';
      case 'non-compliant': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'expired': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="w-4 h-4" />;
      case 'non-compliant': return <XCircle className="w-4 h-4" />;
      case 'pending': return <AlertTriangle className="w-4 h-4" />;
      case 'expired': return <AlertTriangle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const filteredItems = complianceItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || 
                           item.category.toLowerCase() === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const stats = {
    total: complianceItems.length,
    compliant: complianceItems.filter(i => i.status === 'compliant').length,
    nonCompliant: complianceItems.filter(i => i.status === 'non-compliant').length,
    pending: complianceItems.filter(i => i.status === 'pending').length,
    expired: complianceItems.filter(i => i.status === 'expired').length
  };

  const complianceScore = Math.round((stats.compliant / stats.total) * 100) || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Management</h1>
          <p className="text-gray-600 mt-1">Track regulatory compliance and certifications</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button className="btn btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Overall Compliance Score */}
      <div className="card bg-gradient-to-r from-brand-primary to-brand-secondary text-white">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white/90">Overall Compliance Score</h2>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-bold">{complianceScore}%</span>
                <span className="text-sm text-white/70">
                  {complianceScore >= 80 ? 'Excellent' : complianceScore >= 60 ? 'Good' : 'Needs Improvement'}
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 mt-3">
                <div 
                  className="bg-white h-2 rounded-full transition-all duration-500"
                  style={{ width: `${complianceScore}%` }}
                />
              </div>
            </div>
            <Shield className="w-16 h-16 text-white/20" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Compliant</p>
                <p className="text-2xl font-bold text-green-600">{stats.compliant}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-200" />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {Math.round((stats.compliant / stats.total) * 100)}% of total
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Non-Compliant</p>
                <p className="text-2xl font-bold text-red-600">{stats.nonCompliant}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-200" />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Requires immediate action
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-200" />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              In review process
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-gray-600">{stats.expired}</p>
              </div>
              <Calendar className="w-8 h-8 text-gray-200" />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Needs renewal
            </div>
          </div>
        </div>
      </div>

      {/* Categories and Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
              {categories.map(category => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                      ${selectedCategory === category.id 
                        ? 'bg-brand-primary text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <Icon className="w-4 h-4 inline mr-1" />
                    {category.name}
                  </button>
                );
              })}
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search compliance items..."
                  className="w-full pl-10 pr-4 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Items Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No compliance items found
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.title}</div>
                        <div className="text-xs text-gray-500">{item.id}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">{item.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        {item.status.replace('-', ' ')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${getPriorityColor(item.priority)}`}>
                        {item.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">
                        {new Date(item.dueDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Last: {new Date(item.lastChecked).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-24">
                        <div className="text-xs text-gray-600 mb-1">{item.completion}%</div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              item.completion === 100 ? 'bg-green-500' : 
                              item.completion >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${item.completion}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-800">
                          <ClipboardCheck className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}