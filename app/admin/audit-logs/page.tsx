'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ClientDate from '@/components/ClientDate';
import { formatServerDate } from '@/lib/formatServerDate';
import { logger } from '@/lib/logger';

// Fixzit primary timezone for audit logs (canonical timeline)
const DEFAULT_TIMEZONE = 'Asia/Riyadh';
// Constants at module scope
const LOGS_PER_PAGE = 20;
const API_ENDPOINT = '/api/admin/audit-logs';

interface AuditLog {
  id: string;
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

      const response = await fetch(`${API_ENDPOINT}?${params}`, {
        credentials: 'include', // Ensure cookies are sent for authentication
      });
      if (!response.ok) {
        // Provide more specific error messages based on status
        let errorMessage = 'An unexpected error occurred while loading audit logs';
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
        throw new Error(errorMessage);
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
      logger.error(
        'Failed to fetch audit logs',
        err instanceof Error ? err : new Error(String(err)),
        { route: '/admin/audit-logs', page, filters }
      );
      
      // Handle different error types with user-friendly messages
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
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
  }, [filters, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-success bg-success/10 dark:bg-success/10 dark:text-success';
      case 'UPDATE': return 'text-primary bg-primary/10 dark:bg-primary/10 dark:text-primary';
      case 'DELETE': return 'text-destructive bg-destructive/10 dark:bg-destructive/10 dark:text-destructive';
      case 'LOGIN': return 'text-secondary bg-secondary/10 dark:bg-secondary/10 dark:text-secondary';
      case 'LOGOUT': return 'text-muted-foreground bg-muted';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Audit Log
        </h1>
        <p className="mt-2 text-muted-foreground">
          View all system activity and user actions
        </p>
      </div>

      {/* Error Alert - Show at top level for better visibility */}
      {error && (
        <div className="bg-destructive/10 dark:bg-destructive/10 border border-destructive/20 dark:border-destructive/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-destructive dark:text-destructive flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-destructive-foreground dark:text-destructive-foreground mb-1">
                Error Loading Audit Logs
              </h3>
              <p className="text-sm text-destructive dark:text-destructive break-words">
                {error}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setError(null);
                    fetchLogs();
                  }}
                  className="inline-flex items-center gap-1 text-sm font-medium text-destructive-foreground dark:text-destructive-foreground hover:text-destructive-foreground dark:hover:text-destructive-foreground focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 dark:focus:ring-offset-destructive rounded px-2 py-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
                <button
                  onClick={() => setError(null)}
                  className="text-sm font-medium text-destructive dark:text-destructive hover:text-destructive dark:hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 dark:focus:ring-offset-destructive rounded px-2 py-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Action
            </label>
            <select
              className="w-full rounded-2xl border-border bg-background text-foreground"
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
            <label className="block text-sm font-medium text-foreground mb-1">
              Entity Type
            </label>
            <select
              className="w-full rounded-2xl border-border bg-background text-foreground"
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
            <label htmlFor="start-date" className="block text-sm font-medium text-foreground mb-1">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              className="w-full rounded-2xl border-border bg-background text-foreground"
              value={filters.startDate ? filters.startDate.toISOString().split('T')[0] : ''}
              max={filters.endDate ? filters.endDate.toISOString().split('T')[0] : undefined}
              onChange={(e) => {
                const value = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined;
                setFilters({ ...filters, startDate: value });
              }}
            />
          </div>

          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-foreground mb-1">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              className="w-full rounded-2xl border-border bg-background text-foreground"
              value={filters.endDate ? filters.endDate.toISOString().split('T')[0] : ''}
              min={filters.startDate ? filters.startDate.toISOString().split('T')[0] : undefined}
              onChange={(e) => {
                const value = e.target.value ? new Date(e.target.value + 'T23:59:59') : undefined;
                setFilters({ ...filters, endDate: value });
              }}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setFilters({})}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-2xl"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {formatServerDate(log.timestamp, 'medium', undefined, DEFAULT_TIMEZONE)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <div>{log.entityType}</div>
                      {log.entityName && (
                        <div className="text-xs text-muted-foreground">{log.entityName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <div>{log.userName}</div>
                      <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {log.context.ipAddress}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.result.success ? (
                        <span className="text-success">✓ Success</span>
                      ) : (
                        <span className="text-destructive">✗ Failed</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-primary hover:text-primary-foreground dark:text-primary dark:hover:text-primary/80"
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
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-foreground">
              Showing <span className="font-medium">{(page - 1) * LOGS_PER_PAGE + 1}</span> to{' '}
              <span className="font-medium">{Math.min(page * LOGS_PER_PAGE, totalLogs)}</span> of{' '}
              <span className="font-medium">{totalLogs}</span> results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-2xl hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className={`px-4 py-2 text-sm font-medium rounded-2xl ${
                        page === pageNum
                          ? 'bg-primary text-white'
                          : 'text-foreground bg-background border border-border hover:bg-muted'
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
                className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-2xl hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-popover rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-border">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 id="modal-title" className="text-2xl font-bold text-foreground">
                  Audit Log Details
                </h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Timestamp</h3>
                  <p className="mt-1 text-foreground">
                    <ClientDate 
                      date={selectedLog.timestamp} 
                      format="full"
                      timeZone={DEFAULT_TIMEZONE}
                    />
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Action</h3>
                  <p className="mt-1 text-foreground">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">User</h3>
                  <p className="mt-1 text-foreground">
                    {selectedLog.userName} ({selectedLog.userEmail})
                    <span className="ms-2 text-xs text-muted-foreground">
                      Role: {selectedLog.userRole}
                    </span>
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Entity</h3>
                  <p className="mt-1 text-foreground">
                    {selectedLog.entityType}
                    {selectedLog.entityName && ` - ${selectedLog.entityName}`}
                    {selectedLog.entityId && (
                      <span className="ms-2 text-xs text-muted-foreground">
                        ID: {selectedLog.entityId}
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Context</h3>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted p-2 rounded-2xl">
                      <span className="font-medium">Method:</span> {selectedLog.context.method}
                    </div>
                    <div className="bg-muted p-2 rounded-2xl">
                      <span className="font-medium">IP:</span> {selectedLog.context.ipAddress}
                    </div>
                    <div className="bg-muted p-2 rounded-2xl">
                      <span className="font-medium">Browser:</span> {selectedLog.context.browser}
                    </div>
                    <div className="bg-muted p-2 rounded-2xl">
                      <span className="font-medium">OS:</span> {selectedLog.context.os}
                    </div>
                    <div className="bg-muted p-2 rounded-2xl">
                      <span className="font-medium">Device:</span> {selectedLog.context.device}
                    </div>
                    <div className="bg-muted p-2 rounded-2xl">
                      <span className="font-medium">Endpoint:</span> {selectedLog.context.endpoint}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Result</h3>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted p-2 rounded-2xl">
                      <span className="font-medium">Success:</span> {selectedLog.result.success ? 'Yes' : 'No'}
                    </div>
                    {selectedLog.result.errorCode && (
                      <div className="bg-destructive/10 dark:bg-destructive/10 p-2 rounded-2xl">
                        <span className="font-medium text-destructive dark:text-destructive">Error Code:</span> {selectedLog.result.errorCode}
                      </div>
                    )}
                    {selectedLog.result.duration !== undefined && (
                      <div className="bg-muted p-2 rounded-2xl">
                        <span className="font-medium">Duration:</span> {selectedLog.result.duration} ms
                      </div>
                    )}
                  </div>
                </div>

                {selectedLog.changes && selectedLog.changes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Changes</h3>
                    <div className="mt-1 space-y-2">
                      {selectedLog.changes.map((change) => (
                        <div key={change.field} className="p-2 rounded-2xl bg-muted">
                          <div className="flex gap-2">
                            <span className="font-medium">{change.field}:</span>
                            <span className="text-foreground">
                              {JSON.stringify(change.oldValue)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-medium">→</span>
                            <span className="text-foreground">
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