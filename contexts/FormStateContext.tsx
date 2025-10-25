'use client';

import React, { createContext, useContext, useCallback, useState, useRef, ReactNode } from 'react';

// Use unknown instead of any for better type safety
type FormFieldValue = string | number | boolean | null | undefined;
type FormDataRecord = Record<string, FormFieldValue>;

export interface FormStateContextType {
  hasUnsavedChanges: boolean;
  checkUnsavedChanges: () => boolean;
  requestSave?: () => Promise<void>;
  clearUnsavedChanges: () => void;
  setRequestSave: (saveFunction: () => Promise<void>) => void;
  registerForm: (formId: string, initialData: FormDataRecord) => void;
  unregisterForm: (formId: string) => void;
  updateFormData: (formId: string, data: FormDataRecord) => void;
}

const FormStateContext = createContext<FormStateContextType | undefined>(undefined);

export interface FormStateProviderProps {
  children: ReactNode;
  requestSave?: () => Promise<void>;
}

interface FormData {
  initial: FormDataRecord;
  current: FormDataRecord;
}

export function FormStateProvider({ children, requestSave: initialRequestSave }: FormStateProviderProps) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [requestSave, setRequestSave] = useState<(() => Promise<void>) | undefined>(
    () => initialRequestSave
  );
  const formsRef = useRef<Map<string, FormData>>(new Map());

  const checkUnsavedChanges = useCallback(() => {
    let hasChanges = false;
    
    formsRef.current.forEach((formData) => {
      const { initial, current } = formData;
      
      // Deep comparison of form data
      const keys = new Set([...Object.keys(initial), ...Object.keys(current)]);
      for (const key of keys) {
        if (JSON.stringify(initial[key]) !== JSON.stringify(current[key])) {
          hasChanges = true;
          break;
        }
      }
    });
    
    setHasUnsavedChanges(hasChanges);
    return hasChanges;
  }, []);

  const registerForm = useCallback((formId: string, initialData: FormDataRecord) => {
    formsRef.current.set(formId, {
      initial: { ...initialData },
      current: { ...initialData }
    });
  }, []);

  const unregisterForm = useCallback((formId: string) => {
    formsRef.current.delete(formId);
    // Recheck after unregistering
    checkUnsavedChanges();
  }, [checkUnsavedChanges]);

  const updateFormData = useCallback((formId: string, data: FormDataRecord) => {
    const formData = formsRef.current.get(formId);
    if (formData) {
      formData.current = { ...data };
      formsRef.current.set(formId, formData);
      // Trigger change detection
      checkUnsavedChanges();
    }
  }, [checkUnsavedChanges]);

  const clearUnsavedChanges = useCallback(() => {
    // Update initial values to match current values
    formsRef.current.forEach((formData, formId) => {
      formData.initial = { ...formData.current };
      formsRef.current.set(formId, formData);
    });
    
    setHasUnsavedChanges(false);
  }, []);

  const handleSetRequestSave = useCallback((saveFunction: () => Promise<void>) => {
    setRequestSave(() => saveFunction);
  }, []);

  const value: FormStateContextType = {
    hasUnsavedChanges,
    checkUnsavedChanges,
    requestSave,
    clearUnsavedChanges,
    setRequestSave: handleSetRequestSave,
    registerForm,
    unregisterForm,
    updateFormData,
  };

  return (
    <FormStateContext.Provider value={value}>
      {children}
    </FormStateContext.Provider>
  );
}

export function useFormState() {
  const context = useContext(FormStateContext);
  if (context === undefined) {
    throw new Error('useFormState must be used within a FormStateProvider');
  }
  return context;
}
