'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
// Allow legacy code to signal form state changes via window events

interface FormStateContextType {
  hasUnsavedChanges: boolean;
  unregisterForm: (formId: string) => void;
  markFormDirty: (formId: string) => void;
  markFormClean: (formId: string) => void;
  requestSave: (options?: { timeout?: number }) => Promise<void>;
  onSaveRequest: (formId: string, callback: () => Promise<void>) => () => void;
}

const FormStateContext = createContext<FormStateContextType | undefined>(undefined);

export function FormStateProvider({ children }: { children: ReactNode }) {
  const [dirtyForms, setDirtyForms] = useState<Set<string>>(new Set());
  const [saveCallbacks, setSaveCallbacks] = useState<Map<string, () => Promise<void>>>(new Map());
  const isSavingRef = useRef<boolean>(false); // Reentrancy guard

  // Define these callbacks first so they can be used in useEffect below
  const markFormDirty = useCallback((formId: string) => {
    setDirtyForms(prev => new Set(prev).add(formId));
  }, []);

  const markFormClean = useCallback((formId: string) => {
    setDirtyForms(prev => {
      const next = new Set(prev);
      next.delete(formId);
      return next;
    });
  }, []);

  const unregisterForm = useCallback((formId: string) => {
    setDirtyForms(prev => {
      const next = new Set(prev);
      next.delete(formId);
      return next;
    });
    setSaveCallbacks(prev => {
      const next = new Map(prev);
      next.delete(formId);
      return next;
    });
  }, []);

  // --- Legacy / non-React integrations: listen to window events so forms outside
  // React can notify the FormStateProvider about dirty/clean events. This helps
  // migrate pages that still rely on dataset flags or global scripts.
  useEffect(() => {
    const handleDirty = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent)?.detail;
        if (detail && detail.formId) markFormDirty(detail.formId);
      } catch (_e) {
        // ignore malformed events
      }
    };

    const handleClean = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent)?.detail;
        if (detail && detail.formId) markFormClean(detail.formId);
      } catch (_e) {
        // ignore malformed events
      }
    };

    window.addEventListener('fxz:form:dirty', handleDirty as EventListener);
    window.addEventListener('fxz:form:clean', handleClean as EventListener);

    return () => {
      window.removeEventListener('fxz:form:dirty', handleDirty as EventListener);
      window.removeEventListener('fxz:form:clean', handleClean as EventListener);
    };
  }, [markFormDirty, markFormClean]);

  const onSaveRequest = useCallback((formId: string, callback: () => Promise<void>) => {
    setSaveCallbacks(prev => new Map(prev).set(formId, callback));
    
    const dispose = () => {
      setSaveCallbacks(prev => {
        const next = new Map(prev);
        next.delete(formId);
        return next;
      });
      // Also remove from dirtyForms to avoid stale dirty state
      setDirtyForms(prev => {
        const next = new Set(prev);
        next.delete(formId);
        return next;
      });
    };
    
    return dispose;
  }, []);

  const requestSave = useCallback(async (options?: { timeout?: number }) => {
    // Reentrancy guard: prevent concurrent save operations
    if (isSavingRef.current) {
      console.warn('Save operation already in progress, skipping concurrent call');
      return;
    }
    
    isSavingRef.current = true;
    const timeoutMs = options?.timeout ?? 10000; // Default 10s timeout
    
    try {
      // Only save forms that are marked as dirty
      const dirtyFormIds = Array.from(dirtyForms);
      if (dirtyFormIds.length === 0) {
        return; // No dirty forms to save
      }
      
      // Get callbacks only for dirty forms
      const callbacksWithIds = dirtyFormIds
        .map(formId => ({ formId, callback: saveCallbacks.get(formId) }))
        .filter((item): item is { formId: string; callback: () => Promise<void> } => 
          item.callback !== undefined
        );
      
      if (callbacksWithIds.length === 0) {
        console.warn('No save callbacks registered for dirty forms');
        return;
      }
      
      // Wrap save operations with timeout
      const saveWithTimeout = async (formId: string, callback: () => Promise<void>) => {
        const timeoutPromise = new Promise<never>((_resolve, reject) =>
          setTimeout(() => reject(new Error(`Save timeout for form: ${formId}`)), timeoutMs)
        );
        return Promise.race([callback(), timeoutPromise]).then(() => formId);
      };
      
      const results = await Promise.allSettled(
        callbacksWithIds.map(({ formId, callback }) => saveWithTimeout(formId, callback))
      );
      
      // Mark successfully saved forms as clean
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          markFormClean(result.value);
        }
      });
      
      const errors = results.filter(r => r.status === 'rejected');
      if (errors.length > 0) {
        console.error('Save errors occurred:', errors);
        throw new Error(`Failed to save ${errors.length} form(s)`);
      }
    } finally {
      // Always clear the flag, even if errors occurred
      isSavingRef.current = false;
    }
  }, [saveCallbacks, dirtyForms, markFormClean]);

  const hasUnsavedChanges = dirtyForms.size > 0;

  return (
    <FormStateContext.Provider
      value={{
        hasUnsavedChanges,
        unregisterForm,
        markFormDirty,
        markFormClean,
        requestSave,
        onSaveRequest
      }}
    >
      {children}
    </FormStateContext.Provider>
  );
}

export function useFormState() {
  const context = useContext(FormStateContext);
  if (!context) {
    throw new Error('useFormState must be used within a FormStateProvider');
  }
  return context;
}
