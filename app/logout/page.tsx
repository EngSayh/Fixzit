'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { APP_STORAGE_KEYS, STORAGE_KEYS, STORAGE_PREFIXES } from '@/config/constants';

export default function LogoutPage() {
  const router = useRouter();

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
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-foreground mb-2">Signing you out...</h1>
        <p className="text-muted-foreground">Please wait while we log you out securely.</p>
      </div>
    </div>
  );
}
