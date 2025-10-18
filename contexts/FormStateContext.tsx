'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface FormStateContextType {
  hasUnsavedChanges: boolean;
  unregisterForm: (formId: string) => void;
  markFormDirty: (formId: string) => void;
  markFormClean: (formId: string) => void;
  requestSave: () => Promise<void>;
  onSaveRequest: (callback: () => Promise<void>) => void;
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
    const formId = `form-${Date.now()}`;
    setSaveCallbacks(prev => new Map(prev).set(formId, callback));
    return () => {
      setSaveCallbacks(prev => {
        const next = new Map(prev);
        next.delete(formId);
        return next;
      });
    };
  }, []);

  const requestSave = useCallback(async () => {
    const callbacks = Array.from(saveCallbacks.values());
    await Promise.all(callbacks.map(cb => cb()));
  }, [saveCallbacks]);

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
