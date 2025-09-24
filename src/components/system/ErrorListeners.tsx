// src/components/system/ErrorListeners.tsx - Global error listeners (non-blocking)
'use client';
import { useEffect } from 'react';
import { useErrorReporter } from '@/src/hooks/useErrorReporter';
import { useError } from '@/src/contexts/ErrorContext';
import { getErrorByCode } from '@/src/errors/registry';

export default function ErrorListeners({ getUser }: { getUser?: () => any }) {
  const reporter = useErrorReporter(getUser);
  const { notify } = useError();

  useEffect(() => {
    // Window error event
    const onError = async (ev: ErrorEvent) => {
      if (!ev?.error) return;
      
      // Skip hydration errors (handled separately)
      if (/hydration/i.test(ev.message)) return;
      
      // Skip known non-critical errors
      if (/ResizeObserver|Non-Error promise rejection|Script error/i.test(ev.message)) return;

      console.error('Global error caught:', ev.error);
      
      // Determine error code based on the error type
      let errorCode = 'UI-RENDER-FAIL-001';
      if (/ChunkLoadError|Loading chunk/i.test(ev.message)) {
        errorCode = 'NET-CONN-FAIL-001';
      } else if (/Network|fetch/i.test(ev.message)) {
        errorCode = 'NET-TIMEOUT-002';
      }

      const errorInfo = getErrorByCode(errorCode);
      
      // Create incident
      const incidentId = await reporter.send(ev.error, {
        category: 'RUNTIME',
        autoTicket: errorInfo.severity === 'P0' || errorInfo.severity === 'P1'
      });

      // Show toast notification
      await notify(errorCode, {
        incidentId,
        message: ev.error.message,
        severity: errorInfo.severity
      });
    };

    // Unhandled promise rejection
    const onRejection = async (ev: PromiseRejectionEvent) => {
      // Skip cancelled requests
      if (ev.reason?.name === 'AbortError') return;
      
      console.error('Unhandled promise rejection:', ev.reason);
      
      const message = ev.reason?.message || String(ev.reason);
      let errorCode = 'UI-RENDER-FAIL-001';
      
      // Determine error type
      if (/401|Unauthorized/i.test(message)) {
        errorCode = 'AUTH-SESSION-EXP-001';
      } else if (/403|Forbidden/i.test(message)) {
        errorCode = 'WO-API-AUTH-003';
      } else if (/Network|fetch/i.test(message)) {
        errorCode = 'NET-CONN-FAIL-001';
      }

      const errorInfo = getErrorByCode(errorCode);
      
      // Create incident
      const incidentId = await reporter.send(message, {
        category: 'PROMISE',
        autoTicket: errorInfo.severity === 'P0' || errorInfo.severity === 'P1'
      });

      // Show toast notification
      await notify(errorCode, {
        incidentId,
        message,
        severity: errorInfo.severity
      });
    };

    // Custom error event from other components
    const onCustomError = async (ev: any) => {
      const { error, autoSend } = ev.detail;
      if (error) {
        const incidentId = await reporter.send(error, {
          autoTicket: autoSend !== false
        });
        
        // For custom errors, show the dialog immediately
        const { showDialog } = useError();
        showDialog(incidentId);
      }
    };

    // Add listeners
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('fixzit:error', onCustomError);

    // Cleanup
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('fixzit:error', onCustomError);
    };
  }, [reporter, notify]);

  return null;
}
