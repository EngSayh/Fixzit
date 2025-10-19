'use client';

import { useEffect, useCallback } from 'react';
import { useFormState } from '@/contexts/FormStateContext';

/**
 * Hook to register a form's dirty state with the global FormStateContext.
 * 
 * @param isDirty - Whether the form has unsaved changes
 * @param onSave - Async function to save the form data
 * @param formId - Unique identifier for this form (optional, auto-generated if not provided)
 * 
 * @example
 * ```tsx
 * const [formData, setFormData] = useState(initialData);
 * const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);
 * 
 * useFormDirtyState(isDirty, async () => {
 *   await saveFormData(formData);
 * }, 'my-form');
 * ```
 */
export function useFormDirtyState(
  isDirty: boolean,
  onSave: () => Promise<void>,
  formId: string = `form-${Math.random().toString(36).substring(2, 11)}`
) {
  const formState = useFormState();

  // Update the global dirty state when this form's state changes
  useEffect(() => {
    formState.setUnsavedChanges(isDirty);
  }, [isDirty, formState]);

  // Register/unregister save handler
  useEffect(() => {
    if (isDirty) {
      formState.registerSaveHandler(formId, onSave);
    } else {
      formState.unregisterSaveHandler(formId);
    }

    return () => {
      formState.unregisterSaveHandler(formId);
    };
  }, [formId, isDirty, onSave, formState]);

  return {
    isDirty,
    save: onSave,
  };
}
