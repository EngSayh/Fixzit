'use client';
import { useState, useEffect } from 'react';
import { useError } from '@/src/contexts/ErrorContext';

interface ErrorSummary {
  totalErrors: number;
  uniqueIncidentCount: number;
  severityBreakdown: Record<string, number>;
  moduleBreakdown: Record<string, number>;
}

interface AggregatedError {
  errorCode: string;
  module: string;
  category: string;
  count: number;
  firstOccurrence: string;
  lastOccurrence: string;
  severity: string;
  userFacing: boolean;
  autoTicket: boolean;
  uniqueUserCount: number;
  uniqueOrgCount: number;
}

export default function ErrorDashboard() {
  const [summary, setSummary] = useState<ErrorSummary | null>(null);
  const [errors, setErrors] = useState<AggregatedError[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const { reportError } = useError();

  const fetchErrorData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        timeRange,
        ...(selectedModule && { module: selectedModule }),
        ...(selectedSeverity && { severity: selectedSeverity })
      });

      const response = await fetch(`/api/errors/aggregate?${params}`);
      if (!response.ok) throw new Error('Failed to fetch error data');

      const data = await response.json();
      setSummary(data.summary);
      setErrors(data.aggregatedErrors);
    } catch (error) {
      console.error('Failed to fetch error data:', error);
      await reportError('SYS-UI-LOAD-001', 'Failed to load error dashboard', {
        category: 'UI',
        severity: 'ERROR',
        module: 'System',
        autoTicket: true
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrorData();
  }, [timeRange, selectedModule, selectedSeverity]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'ERROR': return 'bg-orange-100 text-orange-800';
      case 'WARN': return 'bg-yellow-100 text-yellow-800';
      case 'INFO': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getModuleColor = (module: string) => {
    const colors = {
      'Work Orders': 'bg-blue-100 text-blue-800',
      'Finance': 'bg-green-100 text-green-800',
      'Properties': 'bg-purple-100 text-purple-800',
      'System': 'bg-red-100 text-red-800',
      'Support': 'bg-yellow-100 text-yellow-800',
      'Marketplace': 'bg-indigo-100 text-indigo-800'
    };
    return colors[module as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0061A8] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading error data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Error Dashboard</h1>
          <p className="text-gray-600">Monitor and analyze system errors across all modules</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Module</label>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
              >
                <option value="">All Modules</option>
                <option value="Work Orders">Work Orders</option>
                <option value="Finance">Finance</option>
                <option value="Properties">Properties</option>
                <option value="System">System</option>
                <option value="Support">Support</option>
                <option value="Marketplace">Marketplace</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="ERROR">Error</option>
                <option value="WARN">Warning</option>
                <option value="INFO">Info</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchErrorData}
                className="w-full px-4 py-2 bg-[#0061A8] text-white rounded-md hover:bg-[#005299] transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Errors</h3>
              <p className="text-3xl font-bold text-[#0061A8]">{summary.totalErrors}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Unique Incidents</h3>
              <p className="text-3xl font-bold text-green-600">{summary.uniqueIncidentCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Critical Errors</h3>
              <p className="text-3xl font-bold text-red-600">{summary.severityBreakdown.CRITICAL || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Rate</h3>
              <p className="text-3xl font-bold text-orange-600">
                {summary.totalErrors > 0 ? Math.round((summary.uniqueIncidentCount / summary.totalErrors) * 100) : 0}%
              </p>
            </div>
          </div>
        )}

        {/* Error List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Error Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Error Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Module
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Occurrence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users Affected
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {errors.map((error, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm font-mono text-gray-900">{error.errorCode}</code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getModuleColor(error.module)}`}>
                        {error.module}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {error.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-semibold">{error.count}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(error.severity)}`}>
                        {error.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(error.lastOccurrence).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {error.uniqueUserCount} users
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-[#0061A8] hover:text-[#005299]">
                          View Details
                        </button>
                        {error.autoTicket && (
                          <button className="text-green-600 hover:text-green-500">
                            View Tickets
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {errors.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No errors found</h3>
            <p className="text-gray-600">Great! No errors were detected for the selected criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}