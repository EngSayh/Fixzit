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
  const inProgressSavesRef = useRef<Map<string, Promise<void>>>(new Map()); // Track in-progress saves per form

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
      // Check if there's an in-progress save for this form before deleting
      const inProgressSave = inProgressSavesRef.current.get(formId);
      if (inProgressSave) {
        console.warn(`Disposer called while save in progress for form: ${formId}. Waiting for completion.`);
        // Wait for in-progress save to finish before disposing
        inProgressSave.finally(() => {
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
          inProgressSavesRef.current.delete(formId);
        });
      } else {
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
      }
    };
    
    return dispose;
  }, []);

  const requestSave = useCallback(async (options?: { timeout?: number }) => {
    // Reentrancy guard: reject concurrent global save operations to prevent race conditions
    // This prevents multiple simultaneous save attempts that could lead to data inconsistency
    if (isSavingRef.current) {
      const error = new Error('Save operation already in progress. Please wait for current save to complete.');
      console.warn(error.message);
      return Promise.reject(error);
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
      
      // Wrap save operations with timeout and track in-progress saves
      const saveWithTimeout = async (formId: string, callback: () => Promise<void>) => {
        const timeoutPromise = new Promise<never>((_resolve, reject) =>
          setTimeout(() => reject(new Error(`Save timeout for form: ${formId}`)), timeoutMs)
        );
        const savePromise = Promise.race([callback(), timeoutPromise]).then(() => {
          // Return void explicitly
        });
        
        // Track this save as in-progress
        inProgressSavesRef.current.set(formId, savePromise);
        
        return savePromise.then(() => formId).finally(() => {
          // Remove from in-progress tracking when done
          inProgressSavesRef.current.delete(formId);
        });
      };
      
      const results = await Promise.allSettled(
        callbacksWithIds.map(({ formId, callback }) => 
          saveWithTimeout(formId, callback).then(
            (savedFormId) => ({ status: 'success' as const, formId: savedFormId }),
            (error) => ({ status: 'error' as const, formId, error })
          )
        )
      );
      
      // Mark successfully saved forms as clean
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.status === 'success') {
          markFormClean(result.value.formId);
        }
      });
      
      // Aggregate errors using formId from the result objects (not array index)
      const errors = results
        .filter((r): r is PromiseFulfilledResult<{ status: 'error'; formId: string; error: unknown }> => 
          r.status === 'fulfilled' && r.value.status === 'error'
        )
        .map(r => r.value);
      
      if (errors.length > 0) {
        const errorDetails = errors
          .map(({ formId, error }) => {
            const message = error instanceof Error ? error.message : String(error);
            return `Form ${formId}: ${message}`;
          })
          .join('; ');
        
        throw new Error(`Failed to save ${errors.length} form(s): ${errorDetails}`);
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
