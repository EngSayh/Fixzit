'use client';

import { signIn } from 'next-auth/react';
import { LogIn } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function GoogleSignInButton() {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      const result = await signIn('google', {
        redirect: false,
        callbackUrl: '/dashboard',
      });

      if (result?.error) {
        // Display user-friendly error message
        setError(t('login.signInError', 'Sign-in failed. Please try again.'));
        console.error('Google sign-in error:', result.error);
      } else if (result?.ok) {
        // Successfully signed in, navigate to dashboard
        router.push(result.url || '/dashboard');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError(t('login.signInError', 'Sign-in failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className={`flex items-center justify-center gap-3 w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isRTL ? 'flex-row-reverse' : ''
        }`}
        type="button"
      >
        <LogIn className="h-5 w-5 text-blue-600" />
        <span>
          {isLoading 
            ? t('login.signingIn', 'Signing in...')
            : `${t('login.continueWith', 'Continue with')} Google`
          }
        </span>
      </button>
      {error && (
        <div 
          role="alert" 
          aria-live="polite"
          className="text-red-600 text-sm text-center p-2 bg-red-50 rounded-md"
        >
          {error}
        </div>
      )}
    </div>
  );
}
