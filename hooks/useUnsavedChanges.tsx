'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface UseUnsavedChangesOptions {
  message?: string;
  saveMessage?: string;
  cancelMessage?: string;
  onSave?: () => Promise<void> | void;
  onDiscard?: () => void;
}

export function useUnsavedChanges(options: UseUnsavedChangesOptions = {}) {
  const {
    message = 'You have unsaved changes. Are you sure you want to leave without saving?',
    saveMessage = 'Your changes have been saved successfully.',
    cancelMessage = 'Changes were not saved.',
    onSave,
    onDiscard
  } = options;

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const originalDataRef = useRef<any>(null);
  const currentDataRef = useRef<any>(null);

  // Mark as dirty when changes are made
  const markDirty = useCallback(() => {
    setIsDirty(true);
    setHasUnsavedChanges(true);
  }, []);

  // Mark as clean when data is saved
  const markClean = useCallback(() => {
    setIsDirty(false);
    setHasUnsavedChanges(false);
    originalDataRef.current = currentDataRef.current;
  }, []);

  // Initialize with initial data
  const initialize = useCallback((initialData: unknown) => {
    originalDataRef.current = initialData;
    currentDataRef.current = initialData;
    setIsDirty(false);
    setHasUnsavedChanges(false);
  }, []);

  // Check if data has changed
  const hasChanges = useCallback((currentData: unknown) => {
    if (!originalDataRef.current || !currentData) return false;
    return JSON.stringify(originalDataRef.current) !== JSON.stringify(currentData);
  }, []);

  // Handle navigation attempt
  const handleNavigation = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowWarning(true);
      return false; // Prevent navigation
    }
    return true; // Allow navigation
  }, [hasUnsavedChanges]);

  // Handle save confirmation
  const handleSave = useCallback(async () => {
    setShowSaveConfirm(true);
    try {
      if (onSave) {
        await onSave();
      }
      markClean();
      setShowSaveConfirm(false);
      // Show success message
      if (typeof window !== 'undefined') {
        alert(saveMessage);
      }
    } catch (error) {
      setShowSaveConfirm(false);
      throw error;
    }
  }, [onSave, markClean, saveMessage]);

  // Handle discard changes
  const handleDiscard = useCallback(() => {
    setIsDirty(false);
    setHasUnsavedChanges(false);
    setShowWarning(false);
    if (onDiscard) {
      onDiscard();
    }
    if (typeof window !== 'undefined') {
      alert(cancelMessage);
    }
  }, [onDiscard, cancelMessage]);

  // Handle stay on page
  const handleStay = useCallback(() => {
    setShowWarning(false);
  }, []);

  // Block browser back/forward
  useEffect(() => {
    if (typeof window !== 'undefined' && hasUnsavedChanges) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = message;
        return message;
      };

      const handlePopState = (e: PopStateEvent) => {
        if (hasUnsavedChanges) {
          e.preventDefault();
          setShowWarning(true);
          window.history.pushState(null, '', window.location.pathname);
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [hasUnsavedChanges, message]);

  return {
    hasUnsavedChanges,
    isDirty,
    showWarning,
    showSaveConfirm,
    markDirty,
    markClean,
    initialize,
    hasChanges,
    handleNavigation,
    handleSave,
    handleDiscard,
    handleStay
  };
}

// Helper component for unsaved changes warning
export function UnsavedChangesWarning({
  isOpen,
  onSave,
  onDiscard,
  onStay,
  title = 'Unsaved Changes',
  message = 'You have unsaved changes. Would you like to save them before leaving?',
  saveText = 'Save Changes',
  discardText = 'Discard Changes',
  stayText = 'Stay Here'
}: {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onStay: () => void;
  title?: string;
  message?: string;
  saveText?: string;
  discardText?: string;
  stayText?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onSave}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            {saveText}
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
          >
            {discardText}
          </button>
          <button
            onClick={onStay}
            className="flex-1 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
          >
            {stayText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper component for save confirmation
export function SaveConfirmation({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Save Changes',
  message = 'Are you sure you want to save these changes?',
  confirmText = 'Save',
  cancelText = 'Cancel'
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
