'use client';
import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { ErrorItem, ErrorReport, ToastError, ModuleKey, Severity } from '@/src/lib/errors/types';
import { getErrorInfo } from '@/src/lib/errors/registry';
import { createErrorItem, createErrorReport, formatErrorForCopy, buildUserContext, buildClientContext } from '@/src/lib/errors/utils';

interface ErrorContextType {
  reportError: (code: string, message: string, options?: {
    stack?: string;
    httpStatus?: number;
    category?: string;
    severity?: Severity;
    module?: ModuleKey;
    autoTicket?: boolean;
  }) => Promise<string>;
  showErrorDialog: (incidentId: string) => void;
  copyErrorDetails: (incidentId: string) => Promise<void>;
  createSupportTicket: (incidentId: string) => Promise<string | null>;
  clearToast: (toastId: string) => void;
  toasts: ToastError[];
}

const ErrorContext = createContext<ErrorContextType | null>(null);

export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within ErrorProvider');
  }
  return context;
}

interface ErrorProviderProps {
  children: React.ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [toasts, setToasts] = useState<ToastError[]>([]);
  const [errorReports, setErrorReports] = useState<Map<string, ErrorReport>>(new Map());
  const [dialogIncidentId, setDialogIncidentId] = useState<string | null>(null);

  // Auto-dismiss toasts after 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setToasts(prev => prev.filter(toast => 
        Date.now() - new Date(toast.timestamp).getTime() < 8000
      ));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const reportError = useCallback(async (
    code: string,
    message: string,
    options: {
      stack?: string;
      httpStatus?: number;
      category?: string;
      severity?: Severity;
      module?: ModuleKey;
      autoTicket?: boolean;
    } = {}
  ): Promise<string> => {
    const errorInfo = getErrorInfo(code);
    const userContext = buildUserContext();
    const clientContext = buildClientContext();

    const errorItem = createErrorItem(code, message, {
      stack: options.stack,
      httpStatus: options.httpStatus,
      category: options.category || errorInfo.category,
      severity: options.severity || (errorInfo.severity === 'P0' ? 'CRITICAL' : 
                                   errorInfo.severity === 'P1' ? 'ERROR' :
                                   errorInfo.severity === 'P2' ? 'ERROR' : 'WARN'),
      module: options.module || (errorInfo.module as ModuleKey)
    });

    const errorReport = createErrorReport([errorItem], {
      route: typeof window !== 'undefined' ? window.location.pathname : '/',
      userContext,
      clientContext
    });

    // Store error report
    setErrorReports(prev => new Map(prev).set(errorReport.incidentId, errorReport));

    // Show toast if user-facing
    if (errorInfo.userFacing) {
      const toast: ToastError = {
        id: errorReport.incidentId,
        title: errorInfo.title_en,
        message: errorInfo.title_ar || errorInfo.title_en,
        severity: errorItem.severity,
        incidentId: errorReport.incidentId,
        code,
        module: errorItem.module,
        timestamp: new Date().toISOString(),
        actions: {
          copy: true,
          report: errorInfo.autoTicket,
          retry: options.httpStatus && options.httpStatus >= 500
        }
      };

      setToasts(prev => [toast, ...prev].slice(0, 5)); // Max 5 toasts
    }

    // Auto-send to support if configured
    if (errorInfo.autoTicket && (options.autoTicket !== false)) {
      try {
        await fetch('/api/errors/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorReport)
        });
      } catch (error) {
        console.warn('Failed to auto-report error:', error);
      }
    }

    return errorReport.incidentId;
  }, []);

  const showErrorDialog = useCallback((incidentId: string) => {
    setDialogIncidentId(incidentId);
  }, []);

  const copyErrorDetails = useCallback(async (incidentId: string) => {
    const errorReport = errorReports.get(incidentId);
    if (!errorReport) return;

    const text = formatErrorForCopy(errorReport);
    
    try {
      await navigator.clipboard.writeText(text);
      // Show brief success feedback
      setToasts(prev => [...prev, {
        id: `copy-${Date.now()}`,
        title: 'Copied to clipboard',
        message: 'Error details copied successfully',
        severity: 'INFO',
        incidentId: '',
        code: '',
        module: 'System',
        timestamp: new Date().toISOString(),
        actions: { copy: false, report: false }
      }]);
    } catch (error) {
      console.error('Failed to copy error details:', error);
    }
  }, [errorReports]);

  const createSupportTicket = useCallback(async (incidentId: string): Promise<string | null> => {
    const errorReport = errorReports.get(incidentId);
    if (!errorReport) return null;

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `[${errorReport.items[0]?.code}] ${errorReport.items[0]?.message}`,
          module: errorReport.module,
          type: 'Bug',
          priority: errorReport.severity === 'CRITICAL' ? 'Urgent' : 
                   errorReport.severity === 'ERROR' ? 'High' : 'Medium',
          category: 'Bug Report',
          subCategory: 'Critical Bug',
          text: formatErrorForCopy(errorReport),
          requester: errorReport.userId ? undefined : {
            name: 'Error Reporter',
            email: 'error-report@fixzit.com',
            phone: 'N/A'
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.code;
      }
    } catch (error) {
      console.error('Failed to create support ticket:', error);
    }

    return null;
  }, [errorReports]);

  const clearToast = useCallback((toastId: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId));
  }, []);

  const value = useMemo(() => ({
    reportError,
    showErrorDialog,
    copyErrorDetails,
    createSupportTicket,
    clearToast,
    toasts
  }), [reportError, showErrorDialog, copyErrorDetails, createSupportTicket, clearToast, toasts]);

  return (
    <ErrorContext.Provider value={value}>
      {children}
      <ErrorToastContainer toasts={toasts} onClear={clearToast} onShowDialog={showErrorDialog} onCopy={copyErrorDetails} onReport={createSupportTicket} />
      {dialogIncidentId && (
        <ErrorDialog 
          incidentId={dialogIncidentId} 
          errorReport={errorReports.get(dialogIncidentId)}
          onClose={() => setDialogIncidentId(null)}
          onCopy={copyErrorDetails}
          onReport={createSupportTicket}
        />
      )}
    </ErrorContext.Provider>
  );
}

// Toast Container Component
function ErrorToastContainer({ 
  toasts, 
  onClear, 
  onShowDialog, 
  onCopy, 
  onReport 
}: {
  toasts: ToastError[];
  onClear: (id: string) => void;
  onShowDialog: (incidentId: string) => void;
  onCopy: (incidentId: string) => Promise<void>;
  onReport: (incidentId: string) => Promise<string | null>;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] space-y-2 max-w-sm">
      {toasts.map(toast => (
        <ErrorToast
          key={toast.id}
          toast={toast}
          onClear={() => onClear(toast.id)}
          onShowDialog={() => onShowDialog(toast.incidentId)}
          onCopy={() => onCopy(toast.incidentId)}
          onReport={() => onReport(toast.incidentId)}
        />
      ))}
    </div>
  );
}

// Individual Toast Component
function ErrorToast({ 
  toast, 
  onClear, 
  onShowDialog, 
  onCopy, 
  onReport 
}: {
  toast: ToastError;
  onClear: () => void;
  onShowDialog: () => void;
  onCopy: () => void;
  onReport: () => void;
}) {
  const severityColors = {
    INFO: 'bg-blue-50 border-blue-200 text-blue-800',
    WARN: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    ERROR: 'bg-red-50 border-red-200 text-red-800',
    CRITICAL: 'bg-red-100 border-red-300 text-red-900'
  };

  return (
    <div className={`p-4 rounded-lg border shadow-lg ${severityColors[toast.severity]} animate-in slide-in-from-right-5`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-sm">{toast.title}</h4>
          <p className="text-xs mt-1 opacity-90">{toast.message}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-mono bg-black/10 px-2 py-1 rounded">
              {toast.code}
            </span>
            <span className="text-xs opacity-75">
              {toast.module}
            </span>
          </div>
        </div>
        <button
          onClick={onClear}
          className="ml-2 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
      
      <div className="flex gap-2 mt-3">
        {toast.actions.copy && (
          <button
            onClick={onCopy}
            className="text-xs px-2 py-1 bg-black/10 hover:bg-black/20 rounded transition-colors"
          >
            Copy
          </button>
        )}
        {toast.actions.report && (
          <button
            onClick={onReport}
            className="text-xs px-2 py-1 bg-[#0061A8] text-white hover:bg-[#005299] rounded transition-colors"
          >
            Report
          </button>
        )}
        <button
          onClick={onShowDialog}
          className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
        >
          Details
        </button>
      </div>
    </div>
  );
}

// Error Dialog Component
function ErrorDialog({ 
  incidentId, 
  errorReport, 
  onClose, 
  onCopy, 
  onReport 
}: {
  incidentId: string;
  errorReport?: ErrorReport;
  onClose: () => void;
  onCopy: (incidentId: string) => Promise<void>;
  onReport: (incidentId: string) => Promise<string | null>;
}) {
  if (!errorReport) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Error Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Incident Information</h3>
              <div className="text-sm space-y-1">
                <div><strong>ID:</strong> {incidentId}</div>
                <div><strong>Module:</strong> {errorReport.module}</div>
                <div><strong>Severity:</strong> {errorReport.severity}</div>
                <div><strong>Time:</strong> {new Date(errorReport.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Error Details</h3>
              <div className="space-y-2">
                {errorReport.items.map((item, index) => (
                  <div key={index} className="text-sm">
                    <div className="font-medium">{item.message}</div>
                    <div className="text-gray-600">
                      Code: {item.code} | Category: {item.category}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onCopy(incidentId)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
              >
                Copy Details
              </button>
              <button
                onClick={async () => {
                  const ticketId = await onReport(incidentId);
                  if (ticketId) {
                    alert(`Support ticket created: ${ticketId}`);
                  }
                }}
                className="px-4 py-2 bg-[#0061A8] text-white hover:bg-[#005299] rounded transition-colors"
              >
                Send to Support
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}