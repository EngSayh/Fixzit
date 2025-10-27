'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface NavigationButtonsProps {
  /**
   * Show Save button
   */
  showSave?: boolean;
  
  /**
   * Show Back button
   */
  showBack?: boolean;
  
  /**
   * Show Home button
   */
  showHome?: boolean;
  
  /**
   * Save button callback. May optionally accept the submit event.
   */
  onSave?: (e?: React.FormEvent) => void | Promise<void>;
  
  /**
   * Custom back URL (defaults to browser back)
   */
  backUrl?: string;
  
  /**
   * Custom home URL (defaults to /dashboard)
   */
  homeUrl?: string;
  
  /**
   * Save button loading state
   */
  saving?: boolean;
  
  /**
   * Save button disabled state
   */
  saveDisabled?: boolean;
  
  /**
   * Save button text
   */
  saveText?: string;
  
  /**
   * Position of the buttons
   */
  position?: 'top' | 'bottom' | 'both';
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Standardized Navigation Buttons Component
 * 
 * Provides consistent Save/Back/Home buttons across all pages.
 * Follows the global UI/UX enhancement requirements.
 * 
 * @example
 * ```tsx
 * <NavigationButtons
 *   showSave
 *   showBack
 *   showHome
 *   onSave={handleSave}
 *   saving={isSaving}
 * />
 * ```
 */
export const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  showSave = false,
  showBack = true,
  showHome = true,
  onSave,
  backUrl,
  homeUrl = '/dashboard',
  saving = false,
  saveDisabled = false,
  saveText = 'Save',
  position = 'bottom',
  className = ''
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  const handleHome = () => {
    router.push(homeUrl);
  };

  const handleSave = async () => {
    if (onSave && !saving && !saveDisabled) {
      await onSave();
    }
  };

  const buttons = (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      {/* Left side: Back & Home */}
      <div className="flex items-center gap-2">
        {showBack && (
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            type="button"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        )}
        
        {showHome && (
          <button
            onClick={handleHome}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            type="button"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </button>
        )}
      </div>

      {/* Right side: Save */}
      {showSave && (
        <button
          onClick={handleSave}
          disabled={saving || saveDisabled}
          className={`inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
            saving || saveDisabled
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          type="button"
        >
          {saving ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {saveText}
            </>
          )}
        </button>
      )}
    </div>
  );

  if (position === 'both') {
    return (
      <>
        <div className="mb-6">{buttons}</div>
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          {buttons}
        </div>
      </>
    );
  }

  if (position === 'top') {
    return <div className="mb-6">{buttons}</div>;
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      {buttons}
    </div>
  );
};

/**
 * Form Wrapper with Navigation Buttons
 * 
 * Wraps a form with automatic navigation buttons
 */
interface FormWithNavigationProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  showSave?: boolean;
  showBack?: boolean;
  showHome?: boolean;
  saving?: boolean;
  saveDisabled?: boolean;
  saveText?: string;
  className?: string;
  /**
   * Position of navigation buttons: 'top', 'bottom', or 'both'
   */
  position?: 'top' | 'bottom' | 'both';
}

export const FormWithNavigation: React.FC<FormWithNavigationProps> = ({
  children,
  onSubmit,
  showSave = true,
  showBack = true,
  showHome = true,
  saving = false,
  saveDisabled = false,
  saveText = 'Save',
  className = '',
  position = 'both'
}) => {
  const handleSubmit = async (e?: React.FormEvent) => {
    // Support both direct form submit event and programmatic save via button click
    const evt = e ?? ({} as React.FormEvent);
    try {
      // preventDefault exists on React.FormEvent, guard defensively
      if (evt && typeof (evt as unknown as { preventDefault?: Function }).preventDefault === 'function') {
        (evt as unknown as { preventDefault: Function }).preventDefault();
      }
    } catch (_err) {
      // ignore
    }
    await onSubmit(evt);
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {(position === 'top' || position === 'both') && (
        <NavigationButtons
          position="top"
          showSave={showSave}
          showBack={showBack}
          showHome={showHome}
          onSave={() => handleSubmit()}
          saving={saving}
          saveDisabled={saveDisabled}
          saveText={saveText}
        />
      )}
      
      {children}
      
      {(position === 'bottom' || position === 'both') && (
        <NavigationButtons
          position="bottom"
          showSave={showSave}
          showBack={showBack}
          showHome={showHome}
          onSave={() => handleSubmit()}
          saving={saving}
          saveDisabled={saveDisabled}
          saveText={saveText}
        />
      )}
    </form>
  );
};

export default NavigationButtons;
