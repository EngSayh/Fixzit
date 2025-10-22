/**
 * Production-Ready Form Tracking Hook
 * 
 * Integrates with FormStateContext to track unsaved changes across all forms.
 * Auto-registers/unregisters on mount/unmount.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useFormState } from '@/contexts/FormStateContext';

export interface UseFormTrackingOptions {
  formId: string;
  isDirty: boolean;
  onBeforeSave?: () => Promise<void> | void;
}

/**
 * Track form state and register with global FormStateContext
 * 
 * @example
 * ```tsx
 * function MyForm() {
 *   const [formData, setFormData] = useState(initialData);
 *   const [originalData] = useState(initialData);
 *   const isDirty = JSON.stringify(formData) !== JSON.stringify(originalData);
 *   
 *   const { handleSubmit } = useFormTracking({
 *     formId: 'my-form',
 *     isDirty,
 *     onBeforeSave: async () => {
 *       await saveFormData(formData);
 *     },
 *   });
 *   
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useFormTracking(options: UseFormTrackingOptions) {
  const { formId, isDirty, onBeforeSave } = options;
  const { onSaveRequest, unregisterForm, markFormDirty, markFormClean } = useFormState();
  const mounted = useRef(false);

  // Register form on mount, unregister on unmount
  useEffect(() => {
    if (!mounted.current && onBeforeSave) {
      mounted.current = true;
      const saveCallback = async () => {
        await onBeforeSave();
      };
      const unsubscribe = onSaveRequest(formId, saveCallback);
      
      return () => {
        unsubscribe();
        unregisterForm(formId);
        mounted.current = false;
      };
    }

    return () => {
      if (mounted.current) {
        unregisterForm(formId);
        mounted.current = false;
      }
    };
  }, [formId, onSaveRequest, unregisterForm, onBeforeSave]);

  // Update dirty state when form data changes
  useEffect(() => {
    if (mounted.current) {
      if (isDirty) {
        markFormDirty(formId);
      } else {
        markFormClean(formId);
      }
    }
  }, [isDirty, formId, markFormDirty, markFormClean]);

  // Wrapper for form submission
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      try {
        if (onBeforeSave) {
          await onBeforeSave();
        }
        
        // Mark form as clean after successful save
        markFormClean(formId);
      } catch (error) {
        // Don't mark clean if save failed
        console.error(`Form ${formId} save failed:`, error);
        throw error;
      }
    },
    [formId, onBeforeSave, markFormClean]
  );

  return {
    handleSubmit,
    isDirty,
  };
}
