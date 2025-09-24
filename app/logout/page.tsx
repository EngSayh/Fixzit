'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, CheckCircle } from 'lucide-react';

export default function LogoutPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'logging-out' | 'success'>('logging-out');

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
        localStorage.removeItem('fixzit-user');
        localStorage.removeItem('fixzit-modules');
        localStorage.removeItem('fixzit-overrides');
        localStorage.removeItem('fixzit-notifications');
        localStorage.removeItem('fxz.lang');
        localStorage.removeItem('fixzit-currency');
        localStorage.removeItem('fixzit-theme');
        localStorage.removeItem('fixzit-login-notification');

        // Clear session storage
        sessionStorage.clear();

        // Clear any other localStorage items related to the app
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('fixzit-') || key.startsWith('fxz-') || key.startsWith('fxz.')) {
            localStorage.removeItem(key);
          }
        });

        // Show success message briefly
        setStatus('success');
        
        // Redirect to login after showing success
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      } catch (error) {
        console.error('Logout error:', error);
        // Still redirect even if API call fails
        router.push('/login');
      }
    };

    handleLogout();
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 py-20">
      <div className="text-center">
        {status === 'logging-out' ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Signing you out...</h1>
            <p className="text-gray-600">Please wait while we log you out securely.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Successfully signed out</h1>
            <p className="text-gray-600">You have been securely logged out of your account.</p>
            <p className="text-sm text-gray-500 mt-2">Redirecting to login page...</p>
          </>
        )}
      </div>
    </div>
  );
}