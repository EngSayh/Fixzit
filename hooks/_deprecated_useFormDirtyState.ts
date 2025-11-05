/**
 * 🟥 DEPRECATED: This hook is part of a redundant implementation.
 * Please use `useFormTracking` instead.
 *
 * @deprecated Use `useFormTracking` from hooks/useFormTracking.ts
 */

'use client';

import { useEffect } from 'react';
import { useFormState } from '@/contexts/FormStateContext';

/**
 * Hook to register a form's dirty state with the global FormStateContext.
 * 
 * @param isDirty - Whether the form has unsaved changes
 * @param onSave - Async function to save the form data
 * @param formId - Unique identifier for this form (required)
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
  formId: string
) {
  const { markFormDirty, markFormClean, onSaveRequest } = useFormState();

  // Update the global dirty state when this form's state changes
  useEffect(() => {
    if (isDirty) {
      markFormDirty(formId);
    } else {
      markFormClean(formId);
    }
  }, [isDirty, formId, markFormDirty, markFormClean]);

  // Register save handler on mount, unregister on unmount
  useEffect(() => {
    const dispose = onSaveRequest(formId, onSave);
    return dispose;
  }, [formId, onSave, onSaveRequest]);

  return {
    isDirty,
    save: onSave,
  };
}
