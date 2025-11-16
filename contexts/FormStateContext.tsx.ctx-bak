'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';
import { logger } from '@/lib/logger';

type AnyValue = unknown;

export interface FormField {
  name: string;
  value: AnyValue;
  initialValue: AnyValue;
  isDirty: boolean;
}

export interface FormState {
  id: string;
  fields: Map<string, FormField>;
  isDirty: boolean;
}

/* eslint-disable no-unused-vars */
export interface FormStateContextValue {
  forms: Map<string, FormState>;
  hasUnsavedChanges: boolean;

  registerForm: (formId: string, initialFields?: Record<string, AnyValue>) => void;
  unregisterForm: (formId: string) => void;

  updateField: (
    formId: string,
    fieldName: string,
    value: AnyValue,
    initialValue?: AnyValue
  ) => void;

  markFormClean: (formId: string) => void;
  getFormState: (formId: string) => FormState | undefined;
  isFormDirty: (formId: string) => boolean;

  /** Ask all forms (or a targeted form) to save and await all registered handlers */
  requestSave: (opts?: { formId?: string }) => Promise<void>;

  /** Legacy-compatible save method across all forms (alias of requestSave) */
  saveAllForms: () => Promise<void>;

  /** Clear dirty flags on all forms and emit a reset event for consumers */
  clearAllUnsavedChanges: () => void;

  /** Legacy compatibility helper to mark one form dirty */
  markFormDirty: (formId: string) => void;

  /**
   * Register a save handler for a given form id. Returns an unsubscribe function.
   * Your form can call `onSave` once on mount:
   *
   *   useEffect(() => onSaveRequest(formId, async () => { await saveApi(...) }), [formId])
   */
  onSaveRequest: (formId: string, callback: () => Promise<void> | void) => () => void;
}
/* eslint-enable no-unused-vars */

export const FormStateContext = createContext<FormStateContextValue | undefined>(undefined);

export const useFormState = (): FormStateContextValue => {
  const ctx = useContext(FormStateContext);
  if (!ctx) throw new Error('useFormState must be used within a FormStateProvider');
  return ctx;
};

type ProviderProps = { children: ReactNode };

const SAVE_EVENT = 'fixzit:save-forms' as const;

export function FormStateProvider({ children }: ProviderProps) {
  const [forms, setForms] = useState<Map<string, FormState>>(new Map());

  const hasUnsavedChanges = useMemo(
    () => Array.from(forms.values()).some(f => f.isDirty),
    [forms],
  );

  // ⚡ NEW: Warn on navigation away if there are unsaved changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue to be set
      return '';
    };
    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', onBeforeUnload);
      return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }
  }, [hasUnsavedChanges]);

  const registerForm = useCallback((formId: string, initialFields?: Record<string, AnyValue>) => {
    setForms(prev => {
      if (prev.has(formId)) return prev;
      const next = new Map(prev);
      const fields = new Map<string, FormField>();
      if (initialFields) {
        Object.entries(initialFields).forEach(([name, value]) => {
          fields.set(name, { name, value, initialValue: value, isDirty: false });
        });
      }
      next.set(formId, { id: formId, fields, isDirty: false });
      return next;
    });
  }, []);

  const unregisterForm = useCallback((formId: string) => {
    setForms(prev => {
      const newForms = new Map(prev);
      newForms.delete(formId);
      return newForms;
    });
  }, []);

  const updateField = useCallback((formId: string, fieldName: string, value: AnyValue, initialValue?: AnyValue) => {
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
      logger.error('Failed to save one or more forms', error as Error, { formCount: Object.keys(forms).length });
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
    // ⚡ IMPROVED: Push promise to aggregator array for coordination
    const handleSave = (event: Event) => {
      const customEvent = event as CustomEvent<{ formId?: string; promises?: Promise<void>[] }>;
      const targetFormId = customEvent.detail?.formId;
      
      // Only run callback if:
      // 1. No formId in event (global save), OR
      // 2. Event formId matches this registration's formId
      if (!targetFormId || targetFormId === formId) {
        const promise = Promise.resolve()
          .then(() => callback())
          .catch((error) => {
            logger.error(`Form save error (${formId})`, error as Error, { formId });
>>>>>>> feat/souq-marketplace-advanced
            throw error; // Re-throw so Promise.all() in requestSave() can handle it
          });
        
        // If event has promises array, push our promise for coordination
        if (customEvent.detail?.promises && Array.isArray(customEvent.detail.promises)) {
          customEvent.detail.promises.push(promise);
        }
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener(SAVE_EVENT, handleSave as EventListener);
    }
    
    // Return cleanup function
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(SAVE_EVENT, handleSave as EventListener);
      }
    };
  }, []);

  // ⚡ NEW: Check if specific form is dirty
  const isFormDirty = useCallback((formId: string) => {
    return forms.get(formId)?.isDirty ?? false;
  }, [forms]);

  // ⚡ NEW: Request save for all or specific form
  const requestSave = useCallback(async (opts?: { formId?: string }) => {
    const promises: Promise<void>[] = [];
    const event = new CustomEvent(SAVE_EVENT, {
      detail: { formId: opts?.formId, promises },
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
    await Promise.all(promises);
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
    isFormDirty,
    requestSave,
  };

  return (
    <FormStateContext.Provider value={value}>
      {children}
    </FormStateContext.Provider>
  );
};

export default FormStateContext;
