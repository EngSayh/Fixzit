'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface FormStateContextType {
  hasUnsavedChanges: boolean;
  unregisterForm: (formId: string) => void;
  markFormDirty: (formId: string) => void;
  markFormClean: (formId: string) => void;
  requestSave: () => Promise<void>;
  onSaveRequest: (callback: () => Promise<void>) => { formId: string; dispose: () => void };
}

const FormStateContext = createContext<FormStateContextType | undefined>(undefined);

export function FormStateProvider({ children }: { children: ReactNode }) {
  const [dirtyForms, setDirtyForms] = useState<Set<string>>(new Set());
  const [saveCallbacks, setSaveCallbacks] = useState<Map<string, () => Promise<void>>>(new Map());

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

  const onSaveRequest = useCallback((callback: () => Promise<void>) => {
    const formId = `form-${crypto.randomUUID()}`;
    setSaveCallbacks(prev => new Map(prev).set(formId, callback));
    
    const dispose = () => {
      setSaveCallbacks(prev => {
        const next = new Map(prev);
        next.delete(formId);
        return next;
      });
    };
    
    return { formId, dispose };
  }, []);

  const requestSave = useCallback(async () => {
    // Only save forms that are marked as dirty
    const dirtyFormIds = Array.from(dirtyForms);
    if (dirtyFormIds.length === 0) {
      return; // No dirty forms to save
    }
    
    // Get callbacks only for dirty forms
    const callbacks = dirtyFormIds
      .map(formId => saveCallbacks.get(formId))
      .filter((cb): cb is () => Promise<void> => cb !== undefined);
    
    if (callbacks.length === 0) {
      console.warn('No save callbacks registered for dirty forms');
      return;
    }
    
    const results = await Promise.allSettled(callbacks.map(cb => cb()));
    const errors = results.filter(r => r.status === 'rejected');
    if (errors.length > 0) {
      console.error('Save errors occurred:', errors);
      throw new Error(`Failed to save ${errors.length} form(s)`);
    }
  }, [saveCallbacks, dirtyForms]);

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
