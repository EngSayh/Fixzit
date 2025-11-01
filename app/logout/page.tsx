'use client';

import { useEffect } from 'react';
// ❌ REMOVED: unused useRouter
import { APP_STORAGE_KEYS, STORAGE_KEYS, STORAGE_PREFIXES } from '@/config/constants';
import { useTranslation } from '@/contexts/TranslationContext'; // ✅ FIX: Import i18n
import { Loader2 } from 'lucide-react'; // ✅ FIX: Import standard loader

export default function LogoutPage() {
  const { t } = useTranslation(); // ✅ FIX: Use i18n hook

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Call logout API to clear server-side session
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });

        // Clear app localStorage items robustly; preserve language + locale
        const preserve = new Set<string>([STORAGE_KEYS.language, STORAGE_KEYS.locale]);
        const removed: string[] = [];

        Object.keys(localStorage).forEach(key => {
          const isAppKey =
            APP_STORAGE_KEYS.includes(key as typeof APP_STORAGE_KEYS[number]) ||
            key.startsWith(STORAGE_PREFIXES.app) ||
            key.startsWith(STORAGE_PREFIXES.shortDash) ||
            key.startsWith(STORAGE_PREFIXES.shortDot);
          if (isAppKey && !preserve.has(key)) {
            localStorage.removeItem(key);
            removed.push(key);
          }
        });

        // Optional: emit an audit event (hook up to your logger/analytics if available)
        try {
          console.info('[logout] clearedLocalStorage', { removedCount: removed.length });
        } catch {
          /* ignore audit log failure */
        }

        // Force a hard reload to clear all state and redirect to login
        window.location.href = '/login';
      } catch (error) {
        console.error('Logout error:', error);
        // Still redirect even if API call fails - use hard reload
        window.location.href = '/login';
      }
    };

    handleLogout();
  }, []); // ✅ FIX: Removed `router` from dependency array

  // ✅ FIX: Use standard components, semantic colors, and i18n
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center p-8">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-foreground mb-2">
          {t('logout.signingOut', 'Signing you out...')}
        </h1>
        <p className="text-muted-foreground">
          {t('logout.pleaseWait', 'Please wait while we log you out securely.')}
        </p>
      </div>
    </div>
  );
}
