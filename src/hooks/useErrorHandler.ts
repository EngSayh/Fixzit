import { useCallback } from 'react';
import { useError } from '@/src/contexts/ErrorContext';
import { fetchWithErrorHandling, FetchError } from '@/src/lib/errors/fetchWrapper';
import { ModuleKey, Severity } from '@/src/lib/errors/types';

export function useErrorHandler() {
  const { reportError } = useError();

  const handleApiError = useCallback(async (
    error: any,
    context: {
      module: ModuleKey;
      operation: string;
      code?: string;
      severity?: Severity;
    }
  ) => {
    const errorCode = context.code || `${context.module}-API-${context.operation.toUpperCase()}-001`;
    const severity = context.severity || 'ERROR';

    await reportError(errorCode, error.message, {
      stack: error.stack,
      httpStatus: error instanceof FetchError ? error.status : undefined,
      category: 'API',
      severity,
      module: context.module,
      autoTicket: true
    });
  }, [reportError]);

  const handleValidationError = useCallback(async (
    errors: Array<{ path: string; message: string }>,
    context: {
      module: ModuleKey;
      operation: string;
    }
  ) => {
    const errorCode = `${context.module}-API-VAL-001`;
    
    await reportError(errorCode, 'Validation failed', {
      category: 'Validation',
      severity: 'ERROR',
      module: context.module,
      autoTicket: false
    });
  }, [reportError]);

  const handleNetworkError = useCallback(async (
    error: any,
    context: {
      module: ModuleKey;
      operation: string;
    }
  ) => {
    const errorCode = `${context.module}-API-NET-001`;
    
    await reportError(errorCode, 'Network request failed', {
      stack: error.stack,
      category: 'Network',
      severity: 'ERROR',
      module: context.module,
      autoTicket: true
    });
  }, [reportError]);

  const safeApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    context: {
      module: ModuleKey;
      operation: string;
      code?: string;
      severity?: Severity;
    }
  ): Promise<T | null> => {
    try {
      return await apiCall();
    } catch (error) {
      await handleApiError(error, context);
      return null;
    }
  }, [handleApiError]);

  const safeFetch = useCallback(async (
    url: string,
    options?: RequestInit,
    context?: {
      module: ModuleKey;
      operation: string;
    }
  ) => {
    try {
      return await fetchWithErrorHandling(url, options);
    } catch (error) {
      if (context) {
        await handleNetworkError(error, context);
      }
      throw error;
    }
  }, [handleNetworkError]);

  return {
    handleApiError,
    handleValidationError,
    handleNetworkError,
    safeApiCall,
    safeFetch,
    reportError
  };
}

// Hook for form validation with error reporting
export function useFormErrorHandler() {
  const { handleValidationError } = useErrorHandler();

  const validateAndReport = useCallback(async (
    validationFn: () => Promise<boolean> | boolean,
    errors: Array<{ path: string; message: string }>,
    context: {
      module: ModuleKey;
      operation: string;
    }
  ) => {
    try {
      const isValid = await validationFn();
      if (!isValid) {
        await handleValidationError(errors, context);
        return false;
      }
      return true;
    } catch (error) {
      await handleValidationError(errors, context);
      return false;
    }
  }, [handleValidationError]);

  return {
    validateAndReport
  };
}