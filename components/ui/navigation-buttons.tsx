'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Home, Save, Loader2 } from 'lucide-react';

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
   * Save button i18n key (defaults to 'common.save')
   */
  saveLabelKey?: string;
  
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
  saveLabelKey = 'common.save',
  position = 'bottom',
  className = ''
}) => {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  
  // FIX: RTL-aware icons
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (onSave && !saving && !saveDisabled) {
      await onSave(e);
    }
  };

  const buttons = (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      {/* Left side: Back & Home */}
      <div className="flex items-center gap-2">
        {showBack && (
          <Button
            onClick={handleBack}
            variant="outline"
            type="button"
          >
            <BackIcon className="h-4 w-4 mr-2" />
            {t('navigation.back', 'Back')}
          </Button>
        )}
        
        {showHome && (
          <Button
            onClick={handleHome}
            variant="outline"
            type="button"
          >
            <Home className="h-4 w-4 mr-2" />
            {t('navigation.home', 'Home')}
          </Button>
        )}
      </div>

      {/* Right side: Save */}
      {showSave && (
        <Button
          onClick={handleSave}
          disabled={saving || saveDisabled}
          variant="default"
          type="button"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('navigation.saving', 'Saving...')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {t(saveLabelKey, 'Save')}
            </>
          )}
        </Button>
      )}
    </div>
  );

  if (position === 'both') {
    return (
      <>
        <div className="mb-6">{buttons}</div>
        <div className="mt-6 pt-6 border-t border-border">
          {buttons}
        </div>
      </>
    );
  }

  if (position === 'top') {
    return <div className="mb-6">{buttons}</div>;
  }

  return (
    <div className="mt-6 pt-6 border-t border-border">
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
  saveLabelKey?: string;
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
  saveLabelKey = 'common.save',
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
          saveLabelKey={saveLabelKey}
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
          saveLabelKey={saveLabelKey}
        />
      )}
    </form>
  );
};

export default NavigationButtons;
