// src/hooks/useErrorReporter.ts - Non-blocking error reporting hook
import { useCallback, useRef } from 'react';
import { buildClientContext, generateCorrelationId } from '@/src/lib/trace';
import { ProblemDetails, isProblemDetails } from '@/src/errors/problem';
import { getErrorByCode } from '@/src/errors/registry';
import { useI18n } from '@/src/providers/RootProviders';

export type UserContext = { 
  userId?: string; 
  email?: string; 
  role?: string; 
  orgId?: string; 
  tenant?: string;
  name?: string;
};

export type ErrorIncident = {
  incidentId: string;
  code: string;
  message: string;
  details?: string;
  severity: string;
  category: string;
  module: string;
  userContext?: UserContext;
  clientContext: any;
  problemDetails?: ProblemDetails;
  stack?: string;
  errors?: Array<{ path?: string; message: string }>;
  timestamp: string;
};

export function useErrorReporter(getUser?: () => UserContext | undefined) {
  const { language } = useI18n();
  const incidentsRef = useRef<Map<string, ErrorIncident>>(new Map());

  // Generate incident ID
  const generateIncidentId = useCallback(() => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `INC-${timestamp}-${random}`.toUpperCase();
  }, []);

  // Copy incident details to clipboard
  const copy = useCallback(async (incidentIdOrPayload: string | any) => {
    try {
      let text: string;
      
      if (typeof incidentIdOrPayload === 'string') {
        // Copy incident details by ID
        const incident = incidentsRef.current.get(incidentIdOrPayload);
        if (incident) {
          text = formatIncidentForCopy(incident, language);
        } else {
          text = incidentIdOrPayload;
        }
      } else {
        // Copy raw payload
        text = typeof incidentIdOrPayload === 'object' 
          ? JSON.stringify(incidentIdOrPayload, null, 2) 
          : String(incidentIdOrPayload);
      }

      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, [language]);

  // Send error report to backend
  const send = useCallback(async (
    errorOrProblem: ProblemDetails | Error | string, 
    options?: {
      category?: string;
      autoTicket?: boolean;
      additionalContext?: any;
    }
  ): Promise<string> => {
    const user = getUser?.() ?? {};
    const clientContext = buildClientContext();
    const incidentId = generateIncidentId();
    const correlationId = clientContext.correlationId || generateCorrelationId();

    // Build incident object
    let incident: ErrorIncident;

    if (typeof errorOrProblem === 'string') {
      // Simple string error
      const errorInfo = getErrorByCode('UI-UI-UNKNOWN-000');
      incident = {
        incidentId,
        code: errorInfo.code,
        message: errorOrProblem,
        severity: errorInfo.severity,
        category: options?.category || errorInfo.category,
        module: errorInfo.module,
        userContext: user,
        clientContext: { ...clientContext, correlationId },
        timestamp: new Date().toISOString()
      };
    } else if (errorOrProblem instanceof Error) {
      // JavaScript Error object
      const errorInfo = getErrorByCode('UI-RENDER-FAIL-001');
      incident = {
        incidentId,
        code: errorInfo.code,
        message: errorOrProblem.message,
        stack: errorOrProblem.stack,
        severity: errorInfo.severity,
        category: options?.category || errorInfo.category,
        module: errorInfo.module,
        userContext: user,
        clientContext: { ...clientContext, correlationId },
        timestamp: new Date().toISOString()
      };
    } else if (isProblemDetails(errorOrProblem)) {
      // Problem Details from API
      const errorInfo = errorOrProblem.code 
        ? getErrorByCode(errorOrProblem.code) 
        : getErrorByCode('UI-UI-UNKNOWN-000');
      
      incident = {
        incidentId,
        code: errorOrProblem.code || errorInfo.code,
        message: language === 'ar' ? errorInfo.title_ar : errorInfo.title_en,
        details: errorOrProblem.detail,
        severity: errorInfo.severity,
        category: errorOrProblem.category || errorInfo.category,
        module: errorOrProblem.module || errorInfo.module,
        userContext: user,
        clientContext: { 
          ...clientContext, 
          correlationId: errorOrProblem.correlationId || correlationId,
          traceId: errorOrProblem.traceId
        },
        problemDetails: errorOrProblem,
        errors: errorOrProblem.errors,
        timestamp: errorOrProblem.timestamp || new Date().toISOString()
      };
    } else {
      // Unknown type
      const errorInfo = getErrorByCode('UI-UI-UNKNOWN-000');
      incident = {
        incidentId,
        code: errorInfo.code,
        message: 'Unknown error',
        severity: errorInfo.severity,
        category: options?.category || errorInfo.category,
        module: errorInfo.module,
        userContext: user,
        clientContext: { ...clientContext, correlationId },
        timestamp: new Date().toISOString()
      };
    }

    // Store incident for later reference
    incidentsRef.current.set(incidentId, incident);

    // Prepare payload
    const payload = {
      ...incident,
      autoTicket: options?.autoTicket !== false, // Default to true
      additionalContext: options?.additionalContext
    };

    // Try sendBeacon first (for reliability on page unload)
    const url = '/api/support/incidents';
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    
    let sent = false;
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      sent = navigator.sendBeacon(url, blob);
    }

    // Fallback to fetch if sendBeacon fails or unavailable
    if (!sent) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 
            'content-type': 'application/json',
            'x-correlation-id': correlationId
          },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        console.error('Failed to send error report:', error);
      }
    }

    return incidentId;
  }, [getUser, generateIncidentId, language]);

  // Get incident by ID
  const getIncident = useCallback((incidentId: string): ErrorIncident | undefined => {
    return incidentsRef.current.get(incidentId);
  }, []);

  return { copy, send, getIncident, generateIncidentId };
}

// Format incident for clipboard copy
function formatIncidentForCopy(incident: ErrorIncident, language: string): string {
  const isArabic = language === 'ar';
  
  const lines = [
    `${isArabic ? 'معرف الحادثة' : 'Incident ID'}: ${incident.incidentId}`,
    `${isArabic ? 'الرمز' : 'Code'}: ${incident.code}`,
    `${isArabic ? 'الوحدة' : 'Module'}: ${incident.module}`,
    `${isArabic ? 'الفئة' : 'Category'}: ${incident.category}`,
    `${isArabic ? 'الخطورة' : 'Severity'}: ${incident.severity}`,
    `${isArabic ? 'الوقت' : 'Time'}: ${incident.timestamp}`,
    '',
    `${isArabic ? 'الرسالة' : 'Message'}: ${incident.message}`,
  ];

  if (incident.details) {
    lines.push(`${isArabic ? 'التفاصيل' : 'Details'}: ${incident.details}`);
  }

  if (incident.errors && incident.errors.length > 0) {
    lines.push('', isArabic ? 'الأخطاء:' : 'Errors:');
    incident.errors.forEach((err, i) => {
      lines.push(`${i + 1}. ${err.path ? `[${err.path}] ` : ''}${err.message}`);
    });
  }

  if (incident.clientContext) {
    lines.push(
      '',
      isArabic ? 'معلومات العميل:' : 'Client Info:',
      `- URL: ${incident.clientContext.url}`,
      `- ${isArabic ? 'اللغة' : 'Locale'}: ${incident.clientContext.locale}`,
      `- ${isArabic ? 'الشبكة' : 'Network'}: ${incident.clientContext.network}`,
    );
  }

  if (incident.stack) {
    lines.push(
      '',
      isArabic ? 'تتبع المكدس:' : 'Stack Trace:',
      '```',
      incident.stack,
      '```'
    );
  }

  return lines.join('\n');
}
