'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface FormState {
  id: string;
  hasUnsavedChanges: boolean;
  isDirty: boolean;
}

interface FormStateContextType {
  forms: Map<string, FormState>;
  hasUnsavedChanges: boolean;
  registerForm: (id: string) => void;
  unregisterForm: (id: string) => void;
  setFormDirty: (id: string, isDirty: boolean) => void;
  setFormUnsavedChanges: (id: string, hasUnsavedChanges: boolean) => void;
  clearAllUnsavedChanges: () => void;
  // Legacy methods for backward compatibility
  markFormDirty: (formId: string) => void;
  markFormClean: (formId: string) => void;
  onSaveRequest: (formId: string, callback: () => Promise<void> | void) => (() => void);
}

const FormStateContext = createContext<FormStateContextType | undefined>(undefined);

export interface FormStateProviderProps {
  children: ReactNode;
}

export function FormStateProvider({ children }: FormStateProviderProps) {
  const [forms, setForms] = useState<Map<string, FormState>>(new Map());

  const hasUnsavedChanges = Array.from(forms.values()).some(
    form => form.hasUnsavedChanges || form.isDirty
  );

  const registerForm = useCallback((id: string) => {
    setForms(prev => {
      const newForms = new Map(prev);
      if (!newForms.has(id)) {
        newForms.set(id, {
          id,
          hasUnsavedChanges: false,
          isDirty: false,
        });
      }
      return newForms;
    });
  }, []);

  const unregisterForm = useCallback((id: string) => {
    setForms(prev => {
      const newForms = new Map(prev);
      newForms.delete(id);
      return newForms;
    });
  }, []);

  const setFormDirty = useCallback((id: string, isDirty: boolean) => {
    setForms(prev => {
      const newForms = new Map(prev);
      const form = newForms.get(id);
      if (form) {
        newForms.set(id, { ...form, isDirty });
      }
      return newForms;
    });
  }, []);

  const setFormUnsavedChanges = useCallback((id: string, hasUnsavedChanges: boolean) => {
    setForms(prev => {
      const newForms = new Map(prev);
      const form = newForms.get(id);
      if (form) {
        newForms.set(id, { ...form, hasUnsavedChanges });
      }
      return newForms;
    });
  }, []);

  const clearAllUnsavedChanges = useCallback(() => {
    setForms(prev => {
      const newForms = new Map(prev);
      for (const [id, form] of newForms) {
        newForms.set(id, { ...form, hasUnsavedChanges: false, isDirty: false });
      }
      return newForms;
    });
  }, []);

  const value: FormStateContextType = {
    forms,
    hasUnsavedChanges,
    registerForm,
    unregisterForm,
    setFormDirty,
    setFormUnsavedChanges,
    clearAllUnsavedChanges,
    // Legacy methods for backward compatibility
    markFormDirty: (formId: string) => setFormDirty(formId, true),
    markFormClean: (formId: string) => setFormDirty(formId, false),
    onSaveRequest: (formId: string, callback: () => Promise<void> | void) => {
      // Store the callback for this form
      // Forms should listen to 'fixzit:save-forms' event
      const handleSave = async (_event: Event) => {
        await callback();
      };
      window.addEventListener('fixzit:save-forms', handleSave);
      // Return disposer
      return () => {
        window.removeEventListener('fixzit:save-forms', handleSave);
      };
    },
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

export function useFormRegistration(formId: string) {
  const { registerForm, unregisterForm, setFormDirty, setFormUnsavedChanges } = useFormState();

  React.useEffect(() => {
    registerForm(formId);
    return () => unregisterForm(formId);
  }, [formId, registerForm, unregisterForm]);

  return {
    setDirty: (isDirty: boolean) => setFormDirty(formId, isDirty),
    setUnsavedChanges: (hasUnsavedChanges: boolean) => setFormUnsavedChanges(formId, hasUnsavedChanges),
  };
}
