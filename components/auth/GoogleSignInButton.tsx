'use client';

import { signIn } from 'next-auth/react';
import { Chrome } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useResponsive } from '@/contexts/ResponsiveContext';

export default function GoogleSignInButton() {
  const { t } = useTranslation();
  const { isRTL } = useResponsive();

  const handleGoogleSignIn = async () => {
    try {
      await signIn('google', {
        callbackUrl: '/dashboard',
        redirect: true,
      });
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      className={`flex items-center justify-center gap-3 w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
        isRTL ? 'flex-row-reverse' : ''
      }`}
      type="button"
    >
      <Chrome className="h-5 w-5 text-blue-600" />
      <span>{t('login.continueWith', 'Continue with')} Google</span>
    </button>
  );
}
