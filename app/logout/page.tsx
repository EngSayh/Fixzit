'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';

export default function LogoutPage() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();

  useEffect(() => {
    const handleLogout = async () => {
      const hasWindow = typeof window !== 'undefined';
      const savedLang = hasWindow ? localStorage.getItem('fxz.lang') : null;
      const savedLocale = hasWindow ? localStorage.getItem('fxz.locale') : null;

      const buildLoginPath = () => {
        const params = new URLSearchParams();
        if (savedLang) params.set('lang', savedLang);
        if (savedLocale) params.set('locale', savedLocale);
        const query = params.toString();
        return query ? `/login?${query}` : '/login';
      };

      try {
        // Call logout API to clear server-side session
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });

        if (hasWindow) {
          // Clear client-side storage
          localStorage.removeItem('fixzit-role');
          localStorage.removeItem('fixzit-currency');
          localStorage.removeItem('fixzit-theme');

          // Clear any other localStorage items related to the app
          Object.keys(localStorage).forEach(key => {
            if ((key.startsWith('fixzit-') || key.startsWith('fxz-')) && key !== 'fxz.lang' && key !== 'fxz.locale') {
              localStorage.removeItem(key);
            }
          });

          // Restore language preferences
          if (savedLang) {
            localStorage.setItem('fxz.lang', savedLang);
          }
          if (savedLocale) {
            localStorage.setItem('fxz.locale', savedLocale);
          }
        }

        if (typeof document !== 'undefined') {
          if (savedLocale) {
            document.documentElement.lang = savedLocale.toLowerCase();
            document.documentElement.setAttribute('data-locale', savedLocale);
          }
          document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
          if (document.body) {
            document.body.style.direction = savedLang === 'ar' ? 'rtl' : 'ltr';
          }
        }

        // Small delay to ensure API call completes
        setTimeout(() => {
          const loginPath = buildLoginPath();
          router.replace(loginPath);
          if (hasWindow) {
            window.requestAnimationFrame(() => {
              window.location.reload();
            });
          }
        }, 100);
      } catch (error) {
        console.error('Logout error:', error);
        // Still redirect even if API call fails
        const loginPath = buildLoginPath();
        router.replace(loginPath);
      }
    };

    handleLogout();
  }, [router]);

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('logout.signingOut', 'Signing you out...')}</h1>
        <p className="text-gray-600">{t('logout.pleaseWait', 'Please wait while we log you out securely.')}</p>
      </div>
    </div>
  );
}
