'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useMemo, ReactNode } from 'react';

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
  // Legacy compatibility methods
  clearAllUnsavedChanges: () => void;
  markFormDirty: (formId: string) => void;
  onSaveRequest: (formId: string, callback: () => Promise<void> | void) => (() => void);
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

export function FormStateProvider({ children }: { children: React.ReactNode }) {
  const [forms, setForms] = useState<Map<string, FormState>>(new Map());
  // Store bound event handlers for cleanup: Map<formId_callbackId, handler>
  const saveHandlersRef = useRef<Map<string, EventListener>>(new Map());

  const hasUnsavedChanges = useMemo(() => {
    return Array.from(forms.values()).some(form => form.isDirty);
  }, [forms]);

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
    const dirtyForms = Array.from(forms.values()).filter(form => form.isDirty);
    
    // ⚡ IMPROVED: Promise aggregation pattern for save coordination
    const promises: Promise<void>[] = [];
    if (typeof window !== 'undefined') {
      const saveEvent = new CustomEvent('fixzit:save-forms', { 
        detail: { promises, timestamp: Date.now() } 
      });
      window.dispatchEvent(saveEvent);
    }
    
    // Wait for all registered save handlers to complete
    try {
      await Promise.all(promises);
      
      // Only mark forms clean after successful saves
      for (const form of dirtyForms) {
        markFormClean(form.id);
      }
    } catch (error) {
      console.error('Failed to save one or more forms:', error);
      // Keep flags intact so user can retry
      throw error;
    }
  }, [forms, markFormClean]);

  const clearAllUnsavedChanges = useCallback(() => {
    forms.forEach(form => markFormClean(form.id));
    
    // Emit event to notify registered forms to reset themselves
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fixzit:clear-forms', { detail: { timestamp: Date.now() } }));
    }
  }, [forms, markFormClean]);

  const markFormDirty = useCallback((formId: string) => {
    setForms(prev => {
      const newForms = new Map(prev);
      const form = newForms.get(formId);
      if (!form) return prev;
      
      newForms.set(formId, {
        ...form,
        isDirty: true,
      });
      return newForms;
    });
  }, []);

  const onSaveRequest = useCallback((formId: string, callback: () => Promise<void> | void) => {
    // Create a unique key for this formId+callback combination
    const handlerKey = `${formId}_${callback.toString().substring(0, 50)}`;
    
    // ⚡ IMPROVED: Push promise to aggregator array for coordination
    const handleSave = (event: Event) => {
      const customEvent = event as CustomEvent<{ formId?: string; promises?: Promise<void>[] }>;
      const targetFormId = customEvent.detail?.formId;
      
      // Only run callback if:
      // 1. No formId in event (global save), OR
      // 2. Event formId matches this registration's formId
      if (!targetFormId || targetFormId === formId) {
        const promise = Promise.resolve().then(() => callback());
        
        // If event has promises array, push our promise for coordination
        if (customEvent.detail?.promises && Array.isArray(customEvent.detail.promises)) {
          customEvent.detail.promises.push(promise);
        }
      }
    };
    
    // Store the handler for stable removal
    saveHandlersRef.current.set(handlerKey, handleSave);
    
    if (typeof window !== 'undefined') {
      window.addEventListener('fixzit:save-forms', handleSave as EventListener);
    }
    
    // Return cleanup function that uses the same handler
    return () => {
      if (typeof window !== 'undefined') {
        const storedHandler = saveHandlersRef.current.get(handlerKey);
        if (storedHandler) {
          window.removeEventListener('fixzit:save-forms', storedHandler as EventListener);
          saveHandlersRef.current.delete(handlerKey);
        }
      }
    };
  }, []);

  const value: FormStateContextValue = {
    forms,
    hasUnsavedChanges,
    registerForm,
    unregisterForm,
    updateField,
    markFormClean,
    getFormState,
    saveAllForms,
    clearAllUnsavedChanges,
    markFormDirty,
    onSaveRequest,
  };

  return (
    <FormStateContext.Provider value={value}>
      {children}
    </FormStateContext.Provider>
  );
};

export default FormStateContext;
