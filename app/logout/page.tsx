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

        // Small delay to ensure API call completes
        setTimeout(() => {
          router.push('/login');
        }, 100);
      } catch (error) {
        console.error('Logout error:', error);
        // Still redirect even if API call fails
        router.push('/login');
      }
    };

    handleLogout();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Signing you out...</h1>
        <p className="text-gray-600">Please wait while we log you out securely.</p>
      </div>
    </div>
  );
}
