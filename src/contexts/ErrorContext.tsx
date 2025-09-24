// src/contexts/ErrorContext.tsx - Global error context with toasts and dialog management
'use client';
import React, { createContext, useCallback, useContext, useMemo, useState, useRef, useEffect } from 'react';
import { AlertCircle, X, Eye } from 'lucide-react';
import { ErrorIncident } from '@/src/hooks/useErrorReporter';
import { useI18n } from '@/src/providers/RootProviders';
import ErrorPopup from '@/src/components/ErrorPopup';
import { ProblemDetails } from '@/src/errors/problem';

type Toast = {
  id: string;
  title: string;
  severity: string;
  timestamp: number;
};

type ErrorContextType = {
  notify: (code: string, partial?: Partial<ErrorIncident>) => Promise<string>;
  showDialog: (incidentId: string) => void;
  hideDialog: () => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
};

const ErrorContext = createContext<ErrorContextType | null>(null);

export const useError = () => {
  const ctx = useContext(ErrorContext);
  if (!ctx) throw new Error('useError must be used within ErrorProvider');
  return ctx;
};

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [dialogData, setDialogData] = useState<{ 
    incidentId?: string; 
    error?: ProblemDetails | Error | string;
    autoSend?: boolean;
  } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { language, isRTL } = useI18n();
  const toastTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const notify = useCallback(async (code: string, partial: Partial<ErrorIncident> = {}) => {
    const incidentId = `INC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
    const timestamp = Date.now();

    // Create toast
    const toast: Toast = {
      id: incidentId,
      title: partial.message || 'An error occurred',
      severity: partial.severity || 'P2',
      timestamp
    };

    setToasts(prev => [...prev, toast].slice(-5)); // Keep max 5 toasts

    // Auto-dismiss after 8 seconds
    const timeout = setTimeout(() => {
      dismissToast(toast.id);
    }, 8000);
    toastTimeoutsRef.current.set(toast.id, timeout);

    return incidentId;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timeout = toastTimeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      toastTimeoutsRef.current.delete(id);
    }
  }, []);

  const showDialog = useCallback((incidentId: string) => {
    setDialogData({ incidentId });
  }, []);

  const hideDialog = useCallback(() => {
    setDialogData(null);
  }, []);

  // Show error dialog for specific error
  const showError = useCallback((error: ProblemDetails | Error | string, autoSend?: boolean) => {
    setDialogData({ error, autoSend });
  }, []);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      toastTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const value = useMemo(() => ({
    notify,
    showDialog,
    hideDialog,
    toasts,
    dismissToast
  }), [notify, showDialog, hideDialog, toasts, dismissToast]);

  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  return (
    <ErrorContext.Provider value={value}>
      {children}
      
      {/* Toast Container */}
      <div 
        className="fixed bottom-4 z-[8999] space-y-2"
        style={{ [isRTL ? 'left' : 'right']: '1rem' }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="min-w-[320px] max-w-md rounded-lg bg-gray-900 text-white shadow-lg animate-slide-up"
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#FFB400] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{toast.title}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => showDialog(toast.id)}
                      className="text-xs text-gray-300 hover:text-white underline flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      {t('View details', 'عرض التفاصيل')}
                    </button>
                    <span className="text-xs text-gray-400">
                      ID: {toast.id.slice(0, 12)}...
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Error Dialog */}
      {dialogData && (
        <ErrorPopup
          error={dialogData.error || `Error ${dialogData.incidentId}`}
          incidentId={dialogData.incidentId}
          onClose={hideDialog}
          autoSend={dialogData.autoSend}
        />
      )}
    </ErrorContext.Provider>
  );
}

// Export showError function for external use
export function showError(error: ProblemDetails | Error | string, autoSend?: boolean) {
  // This would need to be connected to the context, but for now we'll dispatch a custom event
  window.dispatchEvent(new CustomEvent('fixzit:error', { 
    detail: { error, autoSend } 
  }));
}
