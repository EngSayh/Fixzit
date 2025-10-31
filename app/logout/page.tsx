'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

        // Clear client-side storage
        localStorage.removeItem('fixzit-role');
        localStorage.removeItem('fxz.lang');
        localStorage.removeItem('fixzit-currency');
        localStorage.removeItem('fixzit-theme');

        // Clear any other localStorage items related to the app
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('fixzit-') || key.startsWith('fxz-')) {
            localStorage.removeItem(key);
          }
        });

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
