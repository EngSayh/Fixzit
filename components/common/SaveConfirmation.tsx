/**
 * 🟧 FIXED: Moved from hooks/useUnsavedChanges.ts to resolve
 * Single Responsibility Principle (SRP) violation.
 */

"use client";

import React from "react";

/**
 * Helper component for save confirmation
 */
export function SaveConfirmation({
  isOpen,
  onConfirm,
  onCancel,
  title = "Save Changes",
  message = "Are you sure you want to save these changes?",
  confirmText = "Save",
  cancelText = "Cancel",
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3">
          {/* 🟩 FIXED: Use theme-agnostic class names */}
          <button
            onClick={onConfirm}
            className="flex-1 bg-success text-success-foreground px-4 py-2 rounded-md hover:bg-success/90 transition-colors"
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-muted/80 transition-colors"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
