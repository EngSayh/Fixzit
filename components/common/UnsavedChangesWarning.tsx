/**
 * 🟧 FIXED: Moved from hooks/useUnsavedChanges.ts to resolve
 * Single Responsibility Principle (SRP) violation.
 */

"use client";

import React from "react";

/**
 * Helper component for unsaved changes warning
 */
export function UnsavedChangesWarning({
  isOpen,
  onSave,
  onDiscard,
  onStay,
  title = "Unsaved Changes",
  message = "You have unsaved changes. Would you like to save them before leaving?",
  saveText = "Save Changes",
  discardText = "Discard Changes",
  stayText = "Stay Here",
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 🟩 FIXED: Use theme-agnostic class names */}
          <button type="button"
            onClick={onSave}
            className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            aria-label={saveText}
          >
            {saveText}
          </button>
          <button type="button"
            onClick={onDiscard}
            className="flex-1 bg-destructive text-destructive-foreground px-4 py-2 rounded-md hover:bg-destructive/90 transition-colors"
            aria-label={discardText}
          >
            {discardText}
          </button>
          <button type="button"
            onClick={onStay}
            className="flex-1 bg-background text-secondary-foreground border border-border px-4 py-2 rounded-md hover:bg-muted transition-colors"
            aria-label={stayText}
          >
            {stayText}
          </button>
        </div>
      </div>
    </div>
  );
}
