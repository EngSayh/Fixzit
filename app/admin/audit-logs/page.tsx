'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface AuditLog {
  _id: string;
  timestamp: Date;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  context: {
    method: string;
    endpoint: string;
    ipAddress: string;
    browser: string;
    os: string;
    device: string;
  };
  result: {
    success: boolean;
    errorCode?: string;
    duration?: number;
  };
  changes?: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
}

interface AuditLogFilters {
  userId?: string;
  entityType?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const LOGS_PER_PAGE = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.action) params.append('action', filters.action);
      if (filters.startDate) {
        // Convert to ISO string at start of day in UTC
        const startDate = new Date(filters.startDate);
        startDate.setUTCHours(0, 0, 0, 0);
        params.append('startDate', startDate.toISOString());
      }
      if (filters.endDate) {
        // Convert to ISO string at end of day in UTC
        const endDate = new Date(filters.endDate);
        endDate.setUTCHours(23, 59, 59, 999);
        params.append('endDate', endDate.toISOString());
      }
      params.append('page', page.toString());
      params.append('limit', LOGS_PER_PAGE.toString());

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (!response.ok) {
        // Provide more specific error messages based on status
        let errorMessage = 'Failed to fetch audit logs';
        if (response.status === 401) {
          errorMessage = 'You are not authorized to view audit logs. Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to access audit logs.';
        } else if (response.status === 404) {
          errorMessage = 'Audit log service not found. Please contact support.';
        } else if (response.status >= 500) {
          errorMessage = 'Server error occurred while fetching audit logs. Please try again later.';
        } else if (response.status >= 400) {
          errorMessage = 'Invalid request. Please check your filters and try again.';
        }
        throw new Error(`${errorMessage} (${response.status}: ${response.statusText})`);
      }
      
      const data = await response.json();
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from audit log service');
      }
      
      setLogs(data.logs || []);
      setTotalLogs(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / LOGS_PER_PAGE));
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      
      // Handle different error types with user-friendly messages
      let errorMessage = 'Failed to load audit logs. Please try again.';
      
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = 'Network error occurred. Please check your connection and try again.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setLogs([]);
      setTotalLogs(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [filters, page, LOGS_PER_PAGE]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-green-600 bg-green-100';
      case 'UPDATE': return 'text-blue-600 bg-blue-100';
      case 'DELETE': return 'text-red-600 bg-red-100';
      case 'LOGIN': return 'text-purple-600 bg-purple-100';
      case 'LOGOUT': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Audit Log
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View all system activity and user actions
        </p>
      </div>

      {/* Error Alert - Show at top level for better visibility */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                Error Loading Audit Logs
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 break-words">
                {error}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setError(null);
                    fetchLogs();
                  }}
                  className="inline-flex items-center gap-1 text-sm font-medium text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-red-900 rounded px-2 py-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
                <button
                  onClick={() => setError(null)}
                  className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-red-900 rounded px-2 py-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Action
            </label>
            <select
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800"
              value={filters.action || ''}
              onChange={(e) => setFilters({ ...filters, action: e.target.value || undefined })}
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="READ">Read</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Entity Type
            </label>
            <select
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800"
              value={filters.entityType || ''}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value || undefined })}
            >
              <option value="">All Types</option>
              <option value="USER">User</option>
              <option value="PROPERTY">Property</option>
              <option value="TENANT">Tenant</option>
              <option value="CONTRACT">Contract</option>
              <option value="PAYMENT">Payment</option>
              <option value="WORKORDER">Work Order</option>
            </select>
          </div>

          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800"
              value={filters.startDate?.toISOString().split('T')[0] || ''}
              max={filters.endDate?.toISOString().split('T')[0] || undefined}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined })}
            />
          </div>

          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800"
              value={filters.endDate?.toISOString().split('T')[0] || ''}
              min={filters.startDate?.toISOString().split('T')[0] || undefined}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value ? new Date(e.target.value + 'T23:59:59') : undefined })}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setFilters({})}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {error ? (
          <div className="p-12">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">Error Loading Audit Logs</h3>
                  <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
                  <button
                    onClick={() => {
                      setError(null);
                      fetchLogs();
                    }}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div>{log.entityType}</div>
                      {log.entityName && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{log.entityName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div>{log.userName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{log.userEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {log.context.ipAddress}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.result.success ? (
                        <span className="text-green-600">✓ Success</span>
                      ) : (
                        <span className="text-red-600">✗ Failed</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && logs.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-medium">{(page - 1) * LOGS_PER_PAGE + 1}</span> to{' '}
              <span className="font-medium">{Math.min(page * LOGS_PER_PAGE, totalLogs)}</span> of{' '}
              <span className="font-medium">{totalLogs}</span> results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show pages around current page
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedLog(null);
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 id="modal-title" className="text-2xl font-bold text-gray-900 dark:text-white">
                  Audit Log Details
                </h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Timestamp</h3>
                  <p className="mt-1 text-gray-900 dark:text-white">{formatDate(selectedLog.timestamp)}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Action</h3>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">User</h3>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {selectedLog.userName} ({selectedLog.userEmail})
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      Role: {selectedLog.userRole}
                    </span>
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Entity</h3>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {selectedLog.entityType}
                    {selectedLog.entityName && ` - ${selectedLog.entityName}`}
                    {selectedLog.entityId && (
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        ID: {selectedLog.entityId}
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Context</h3>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <span className="font-medium">Method:</span> {selectedLog.context.method}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <span className="font-medium">IP:</span> {selectedLog.context.ipAddress}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <span className="font-medium">Browser:</span> {selectedLog.context.browser}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <span className="font-medium">OS:</span> {selectedLog.context.os}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <span className="font-medium">Device:</span> {selectedLog.context.device}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <span className="font-medium">Endpoint:</span> {selectedLog.context.endpoint}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Result</h3>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <span className="font-medium">Success:</span> {selectedLog.result.success ? 'Yes' : 'No'}
                    </div>
                    {selectedLog.result.errorCode && (
                      <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        <span className="font-medium text-red-600 dark:text-red-400">Error Code:</span> {selectedLog.result.errorCode}
                      </div>
                    )}
                    {selectedLog.result.duration !== undefined && (
                      <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <span className="font-medium">Duration:</span> {selectedLog.result.duration} ms
                      </div>
                    )}
                  </div>
                </div>

                {selectedLog.changes && selectedLog.changes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Changes</h3>
                    <div className="mt-1 space-y-2">
                      {selectedLog.changes.map((change, index) => (
                        <div key={index} className="p-2 rounded bg-gray-50 dark:bg-gray-800">
                          <div className="flex gap-2">
                            <span className="font-medium">{change.field}:</span>
                            <span className="text-gray-900 dark:text-white">
                              {JSON.stringify(change.oldValue)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-medium">→</span>
                            <span className="text-gray-900 dark:text-white">
                              {JSON.stringify(change.newValue)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}