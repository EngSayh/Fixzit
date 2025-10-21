'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';

interface FormStateContextType {
  hasUnsavedChanges: boolean;
  unregisterForm: (formId: string) => void;
  markFormDirty: (formId: string) => void;
  markFormClean: (formId: string) => void;
  requestSave: () => Promise<void>;
  onSaveRequest: (formId: string, callback: () => Promise<void>) => () => void;
}

const FormStateContext = createContext<FormStateContextType | undefined>(undefined);

export function FormStateProvider({ children }: { children: ReactNode }) {
  const [dirtyForms, setDirtyForms] = useState<Set<string>>(new Set());
  const [saveCallbacks, setSaveCallbacks] = useState<Map<string, () => Promise<void>>>(new Map());
  const isSavingRef = useRef<boolean>(false); // Reentrancy guard

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

  const requestSave = useCallback(async () => {
    // Reentrancy guard: prevent concurrent save operations
    if (isSavingRef.current) {
      console.warn('Save operation already in progress, skipping concurrent call');
      return;
    }
    
    isSavingRef.current = true;
    
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
      
      const results = await Promise.allSettled(
        callbacksWithIds.map(async ({ formId, callback }) => {
          await callback();
          return formId;
        })
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
