"use client";

import { logger } from "@/lib/logger";
import { useEffect, useCallback, useRef } from "react";
import { useFormState } from "@/contexts/FormStateContext";

/**
 * 🟥 ARCHITECTURAL FIX: CONSOLIDATED FORM TRACKING HOOK
 *
 * This hook is the single source of truth for tracking form state.
 * It combines the best parts of:
 * - `useFormTracking` (context registration)
 * - `useUnsavedChanges` (browser-level 'beforeunload' and 'popstate' guards)
 * - `useFormDirtyState` (simple dirty state management)
 *
 * It deprecates `useFormDirtyState` and `useUnsavedChanges`.
 */

export interface UseFormTrackingOptions {
  /** A unique ID for this form */
  formId: string;
  /** A boolean from your component's state indicating if the form is dirty */
  isDirty: boolean;
  /** An async function to call when a global save is triggered */
  onSave: () => Promise<void>;
  /** Custom message for the browser's "unsaved changes" prompt */
  unsavedMessage?: string;
}

const DEFAULT_UNSAVED_MESSAGE =
  "You have unsaved changes. Are you sure you want to leave?";

/**
 * Production-Ready Form Tracking Hook
 *
 * Integrates with FormStateContext to track unsaved changes across all forms
 * and prevents browser navigation when dirty.
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
 *     onSave: async () => {
 *       await saveFormData(formData);
 *       setOriginalData(formData); // Resets dirty state
 *     },
 *   });
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useFormTracking(options: UseFormTrackingOptions) {
  const {
    formId,
    isDirty,
    onSave,
    unsavedMessage: _unsavedMessage = DEFAULT_UNSAVED_MESSAGE,
  } = options;
  const {
    registerForm,
    onSaveRequest,
    unregisterForm,
    markFormDirty,
    markFormClean,
  } = useFormState();

  // Keep a ref to the save function to avoid re-running effects
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // ✅ FIXED: Register form on mount so it appears in context's forms Map
  useEffect(() => {
    registerForm(formId); // Register without initial fields (will use empty object)

    const saveCallback = () => onSaveRef.current();
    const unsubscribe = onSaveRequest(formId, saveCallback);

    return () => {
      unsubscribe();
      unregisterForm(formId);
    };
  }, [formId, registerForm, onSaveRequest, unregisterForm]);

  // Update global dirty state when this form's state changes
  useEffect(() => {
    if (isDirty) {
      markFormDirty(formId);
    } else {
      markFormClean(formId);
    }
  }, [isDirty, formId, markFormDirty, markFormClean]);

  // ✅ REMOVED: Duplicate beforeunload listener
  // FormStateContext already installs a centralized guard when hasUnsavedChanges is true
  // Individual forms should not install their own listeners

  /**
   * Wrapper for form's local onSubmit handler.
   * Prevents default event, calls the save function,
   * and marks the form clean on success.
   */
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      try {
        await onSaveRef.current();
        // The form's onSave logic should update its state,
        // which will set isDirty=false, triggering the effect above.
      } catch (error) {
        // Don't mark clean if save failed
        logger.error(`Form ${formId} save failed`, error as Error, { formId });
        throw error; // Re-throw for local error handling
      }
    },
    [formId],
  );

  return {
    handleSubmit,
    isDirty,
  };
}
