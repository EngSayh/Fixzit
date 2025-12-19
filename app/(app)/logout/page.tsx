'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { APP_STORAGE_KEYS, STORAGE_KEYS, STORAGE_PREFIXES } from '@/config/constants';
import { BrandLogo } from '@/components/brand';

type LogoutState = 'processing' | 'success' | 'error';

export default function LogoutPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [state, setState] = useState<LogoutState>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const clearAuthCookies = () => {
      const authCookieNames = [
        // Standard NextAuth/Auth.js cookies
        'authjs.callback-url',
        'next-auth.callback-url',
        'authjs.session-token',
        'next-auth.session-token',
        'authjs.csrf-token',
        'next-auth.csrf-token',
        // Secure variants used in HTTPS deployments
        '__Secure-authjs.callback-url',
        '__Secure-next-auth.callback-url',
        '__Secure-authjs.session-token',
        '__Secure-next-auth.session-token',
        '__Secure-authjs.csrf-token',
        '__Secure-next-auth.csrf-token',
        '__Host-next-auth.csrf-token',
        'fxz.access',
        'fxz.refresh',
        'fxz.otp',
        // BUG-001 FIX: Clear impersonation context cookie on logout
        'support_org_id',
        // Clear superadmin session cookies
        'superadmin_session',
        'superadmin_session.legacy',
      ];
      try {
        const isHttps = window.location.protocol === 'https:';
        const host = window.location.hostname;
        const canUseDomain = host !== 'localhost' && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
        authCookieNames.forEach(name => {
          // Clear cookie without Secure flag (works for HTTP and HTTPS)
          document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
          // Also try with Secure flag for HTTPS-only cookies
          if (isHttps) {
            document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax; Secure`;
          }
          // Try with domain for subdomain cookies (both variants)
          if (canUseDomain) {
            document.cookie = `${name}=; Max-Age=0; path=/; domain=${host}; SameSite=Lax`;
            if (isHttps) {
              document.cookie = `${name}=; Max-Age=0; path=/; domain=${host}; SameSite=Lax; Secure`;
            }
          }
        });
      } catch (err) {
        logger.warn('Failed to clear auth cookies on logout', { error: err });
      }
    };

    const handleLogout = async () => {
      try {
        setState('processing');

        // Step 1: Clear app-specific storage (preserve language/locale)
        // Wrapped in try/catch for Safari Private Mode and strict CSP environments
        try {
          const savedLang = localStorage.getItem(STORAGE_KEYS.language);
          const savedLocale = localStorage.getItem(STORAGE_KEYS.locale);

          Object.keys(localStorage).forEach(key => {
            const isAppKey =
              APP_STORAGE_KEYS.includes(key) ||
              key.startsWith(STORAGE_PREFIXES.app) ||
              key.startsWith(STORAGE_PREFIXES.shortDash) ||
              key.startsWith(STORAGE_PREFIXES.shortDot);
            const preserve = key === STORAGE_KEYS.language || key === STORAGE_KEYS.locale;
            if (isAppKey && !preserve) localStorage.removeItem(key);
          });

          // Restore language preferences
          if (savedLang) localStorage.setItem(STORAGE_KEYS.language, savedLang);
          if (savedLocale) localStorage.setItem(STORAGE_KEYS.locale, savedLocale);
        } catch (storageErr) {
          logger.warn('localStorage unavailable during logout (Safari Private Mode or CSP restriction)', { error: storageErr });
        }

        // Step 2: Clear session storage
        try {
          sessionStorage.clear();
        } catch (e) {
          logger.warn('Failed to clear session storage', { error: e });
        }

        // Step 3: Clear auth cookies explicitly (callback/session)
        clearAuthCookies();

        // Step 4: Sign out with NextAuth (clears cookies)
        const signOutResult = await signOut({ 
          redirect: false, // Manual redirect for better control
          redirectTo: '/login',
        });
        const redirectUrl = signOutResult?.url || '/login';

        // Step 5: Wait for cleanup to propagate
        await new Promise(resolve => setTimeout(resolve, 500));

        if (!mounted) return;

        setState('success');

        // Step 6: Redirect after showing success
        const successTimer = setTimeout(() => {
          if (mounted) router.push(redirectUrl);
        }, 1000);

        // Store timer for cleanup
        return () => clearTimeout(successTimer);

      } catch (error) {
        logger.error('Logout error:', error);
        if (!mounted) return;
        
        setState('error');
        setError(error instanceof Error ? error.message : 'Logout failed');

        // Still attempt redirect after error
        const errorTimer = setTimeout(() => {
          if (mounted) router.push('/login');
        }, 2000);

        // Store timer for cleanup
        return () => clearTimeout(errorTimer);
      }
    };

    let cleanupFn: (() => void) | undefined;
    
    handleLogout().then(fn => {
      if (mounted) cleanupFn = fn;
    });

    return () => {
      mounted = false;
      cleanupFn?.(); // Clear any pending timers
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background" data-testid="logout-page">
      <div className="text-center p-8 max-w-md">
        {/* Brand Logo - consistent across all auth pages */}
        <div className="mb-6">
          <BrandLogo 
            size="lg" 
            alt="Fixzit" 
            fetchOrgLogo={false}
            data-testid="logout-logo"
          />
        </div>
        
        {state === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" data-testid="logout-spinner" />
            <h1 className="text-xl font-semibold text-foreground mb-2">
              {t('logout.signingOut', 'Signing you out...')}
            </h1>
            <p className="text-muted-foreground">
              {t('logout.pleaseWait', 'Please wait while we log you out securely.')}
            </p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" data-testid="logout-success" />
            <h1 className="text-xl font-semibold text-foreground mb-2">
              {t('logout.success', 'Logged out successfully')}
            </h1>
            <p className="text-muted-foreground">
              {t('logout.redirecting', 'Redirecting to login...')}
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" data-testid="logout-error" />
            <h1 className="text-xl font-semibold text-foreground mb-2">
              {t('logout.error', 'Logout error')}
            </h1>
            <p className="text-muted-foreground mb-4">
              {error || t('logout.errorMessage', 'An error occurred during logout')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('logout.redirectingAfterError', 'Redirecting to login...')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
