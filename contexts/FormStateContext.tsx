'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface FormField {
  name: string;
  value: any;
  initialValue: any;
  isDirty: boolean;
}

interface FormState {
  id: string;
  fields: Map<string, FormField>;
  isDirty: boolean;
}

interface FormStateContextValue {
  forms: Map<string, FormState>;
  hasUnsavedChanges: boolean;
  registerForm: (formId: string) => void;
  unregisterForm: (formId: string) => void;
  updateField: (formId: string, fieldName: string, value: any, initialValue?: any) => void;
  markFormClean: (formId: string) => void;
  getFormState: (formId: string) => FormState | undefined;
  saveAllForms: () => Promise<void>;
}

const FormStateContext = createContext<FormStateContextValue | undefined>(undefined);

export const useFormState = () => {
  const context = useContext(FormStateContext);
  if (!context) {
    throw new Error('useFormState must be used within a FormStateProvider');
  }
  return context;
};

interface FormStateProviderProps {
  children: ReactNode;
}

export const FormStateProvider: React.FC<FormStateProviderProps> = ({ children }) => {
  const [forms, setForms] = useState<Map<string, FormState>>(new Map());

  const hasUnsavedChanges = Array.from(forms.values()).some(form => form.isDirty);

  const registerForm = useCallback((formId: string) => {
    setForms(prev => {
      const newForms = new Map(prev);
      if (!newForms.has(formId)) {
        newForms.set(formId, {
          id: formId,
          fields: new Map(),
          isDirty: false,
        });
      }
      return newForms;
    });
  }, []);

  const unregisterForm = useCallback((formId: string) => {
    setForms(prev => {
      const newForms = new Map(prev);
      newForms.delete(formId);
      return newForms;
    });
  }, []);

  const updateField = useCallback((formId: string, fieldName: string, value: any, initialValue?: any) => {
    setForms(prev => {
      const newForms = new Map(prev);
      const form = newForms.get(formId);
      if (!form) return prev;

      const field = form.fields.get(fieldName);
      const fieldInitialValue = initialValue ?? field?.initialValue ?? value;
      const isDirty = value !== fieldInitialValue;

      const newField: FormField = {
        name: fieldName,
        value,
        initialValue: fieldInitialValue,
        isDirty,
      };

      const newFormFields = new Map(form.fields);
      newFormFields.set(fieldName, newField);

      const formIsDirty = Array.from(newFormFields.values()).some(f => f.isDirty);

      newForms.set(formId, {
        ...form,
        fields: newFormFields,
        isDirty: formIsDirty,
      });

      return newForms;
    });
  }, []);

  const markFormClean = useCallback((formId: string) => {
    setForms(prev => {
      const newForms = new Map(prev);
      const form = newForms.get(formId);
      if (!form) return prev;

      const cleanFields = new Map();
      form.fields.forEach((field, name) => {
        cleanFields.set(name, {
          ...field,
          initialValue: field.value,
          isDirty: false,
        });
      });

      newForms.set(formId, {
        ...form,
        fields: cleanFields,
        isDirty: false,
      });

      return newForms;
    });
  }, []);

  const getFormState = useCallback((formId: string) => {
    return forms.get(formId);
  }, [forms]);

  const saveAllForms = useCallback(async () => {
    // Placeholder for save logic - can be implemented by forms
    const dirtyForms = Array.from(forms.values()).filter(form => form.isDirty);
    
    for (const form of dirtyForms) {
      markFormClean(form.id);
    }
  }, [forms, markFormClean]);

  const value: FormStateContextValue = {
    forms,
    hasUnsavedChanges,
    registerForm,
    unregisterForm,
    updateField,
    markFormClean,
    getFormState,
    saveAllForms,
  };

  return (
    <FormStateContext.Provider value={value}>
      {children}
    </FormStateContext.Provider>
  );
};

export default FormStateContext;
