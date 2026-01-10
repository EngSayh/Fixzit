'use client';
import { logger } from '@/lib/logger';
import { EMAIL_DOMAINS } from '@/lib/config/domains';

import { useState, useEffect, useRef } from 'react';

// ✅ FIXED: Use standard components
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

// ✅ FIXED: Add i18n support
import { useTranslation } from '@/contexts/TranslationContext';

// Lucide icons
import { Lock, CheckCircle } from '@/components/ui/icons';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

/**
 * ✅ REFACTORED UpgradeModal Component
 * 
 * ARCHITECTURE IMPROVEMENTS:
 * 1. ✅ Standard Dialog/Button components (no hardcoded modal)
 * 2. ✅ Standard Input component (no raw input elements)
 * 3. ✅ Full i18n support (20+ translatable strings)
 * 4. ✅ Semantic tokens (text-success, text-destructive, text-primary)
 * 5. ✅ FeatureListItem helper component for DRY code
 * 6. ✅ SuccessView helper component for state management
 * 7. ✅ Internal success state (NO fragile window.toast)
 * 8. ✅ State reset on close (prevents stale data on reopen)
 * 9. ✅ FIXED: Timer cleanup to prevent memory leaks (closeTimer, successTimer)
 */
export function UpgradeModal({ isOpen, onClose, featureName }: UpgradeModalProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ FIXED: Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // ✅ FIXED: Reset state when modal closes to prevent stale data
  const handleClose = () => {
    onClose();
    // Clear any pending timers
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    // Reset state after animation completes (300ms)
    closeTimerRef.current = setTimeout(() => {
      setEmail('');
      setError('');
      setShowSuccess(false);
    }, 300);
  };

  const handleContactSales = async () => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setError(t('upgrade.error.invalidEmail', 'Please enter a valid email address'));
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/contact-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          feature: featureName || t('upgrade.feature.enterprise', 'Enterprise Features'),
          interest: 'upgrade'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit request');
      }
      
      // ✅ FIXED: Use internal success state instead of window.toast
      setError('');
      setShowSuccess(true);
      
      // Auto-close after 3 seconds (with cleanup)
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => {
        setShowSuccess(false);
        handleClose();
      }, 3000);
    } catch (error) {
      logger.error('Failed to submit contact request', { error });
      setError(t('upgrade.error.submitFailed', `Failed to submit request. Please email ${EMAIL_DOMAINS.sales} directly.`));
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ FIXED: Success view component
  if (showSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-popover text-popover-foreground border-border">
          <SuccessView onClose={handleClose} t={t} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-popover text-popover-foreground border-border max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Lock className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Header */}
        <DialogHeader>
          <DialogTitle className="text-foreground text-center">
            {t('upgrade.title', 'Enterprise Feature')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-center">
            {featureName ? (
              <>
                <strong>{featureName}</strong> {t('upgrade.description.feature', 'is available in the Enterprise plan with advanced features and dedicated support.')}
              </>
            ) : (
              t('upgrade.description.default', 'This feature is available in the Enterprise plan with advanced features and dedicated support.')
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Features included */}
        <div className="bg-muted rounded-2xl p-4 mb-4">
          <h4 className="font-semibold text-foreground mb-3">
            {t('upgrade.includes.title', 'Enterprise includes:')}
          </h4>
          <ul className="space-y-2">
            <FeatureListItem text={t('upgrade.feature.premium', 'All Premium features included')} />
            <FeatureListItem text={t('upgrade.feature.api', 'Advanced API integrations')} />
            <FeatureListItem text={t('upgrade.feature.support', '24/7 priority support')} />
            <FeatureListItem text={t('upgrade.feature.sla', 'Custom SLA agreements')} />
          </ul>
        </div>

        {/* Contact form */}
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            {t('upgrade.email.label', 'Email Address')}
          </label>
          <Input
            type="email"
            id="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            placeholder={t('upgrade.email.placeholder', 'your@email.com')}
            disabled={submitting}
            className="w-full"
          />
          {error && (
            <p className="mt-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        {/* Actions */}
        <DialogFooter className="flex-row gap-3 sm:gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
            className="flex-1"
            aria-label={t('upgrade.action.later', 'Maybe Later')}
            title={t('upgrade.action.later', 'Maybe Later')}
          >
            {t('upgrade.action.later', 'Maybe Later')}
          </Button>
          <Button
            variant="default"
            onClick={handleContactSales}
            disabled={submitting}
            className="flex-1 font-semibold"
            aria-label={t('upgrade.action.contact', 'Contact Sales')}
            title={t('upgrade.action.contact', 'Contact Sales')}
          >
            {submitting 
              ? t('upgrade.action.sending', 'Sending...') 
              : t('upgrade.action.contact', 'Contact Sales')}
          </Button>
        </DialogFooter>

        {/* Alternative contact */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          {t('upgrade.alternative.prefix', 'Or email us directly at')}{' '}
          <a href={`mailto:${EMAIL_DOMAINS.sales}`} className="text-primary hover:underline">
            {EMAIL_DOMAINS.sales}
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ✅ EXTRACTED: FeatureListItem Helper
 * Displays a feature with check icon and semantic colors
 */
interface FeatureListItemProps {
  text: string;
}

function FeatureListItem({ text }: FeatureListItemProps) {
  return (
    <li className="flex items-start text-sm text-muted-foreground">
      <CheckCircle className="w-5 h-5 text-success me-2 flex-shrink-0 mt-0.5" />
      {text}
    </li>
  );
}

/**
 * ✅ EXTRACTED: SuccessView Helper
 * Shows success confirmation after form submission
 */
interface SuccessViewProps {
  onClose: () => void;
  t: (key: string, fallback?: string) => string;
}

function SuccessView({ onClose, t }: SuccessViewProps) {
  return (
    <>
      <div className="flex justify-center mb-4">
        <div className="rounded-full bg-success/10 p-3">
          <CheckCircle className="w-12 h-12 text-success" />
        </div>
      </div>

      <DialogHeader>
        <DialogTitle className="text-foreground text-center">
          {t('upgrade.success.title', 'Request Submitted!')}
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-center">
          {t('upgrade.success.message', 'Thank you! Our sales team will contact you shortly.')}
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button
          variant="default"
          onClick={onClose}
          className="w-full"
          aria-label={t('common.close', 'Close dialog')}
          title={t('common.close', 'Close dialog')}
        >
          {t('common.close', 'Close')}
        </Button>
      </DialogFooter>
    </>
  );
}
