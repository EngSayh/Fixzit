'use client';

import { signIn } from 'next-auth/react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { logger } from '@/lib/logger';

// ✅ FIX: Add a dedicated GoogleIcon component for brand consistency
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.223 0-9.651-3.356-11.303-8H6.306C9.656 39.663 16.318 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.19 4.223-4.131 5.571l6.19 5.238C39.712 34.171 44 27.881 44 20c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

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
        // Log the actual error string for debugging
        import('../../lib/logger').then(({ logWarn }) => {
          logWarn('Google sign-in failed', {
            component: 'GoogleSignInButton',
            error: result.error,
          });
        }).catch(logErr => logger.error('Failed to load logger:', { error: logErr }));
      } else if (result?.ok) {
        // Successfully signed in, navigate to dashboard
        router.push(result.url || '/dashboard');
      }
    } catch (error) {
      setError(t('login.signInError', 'Sign-in failed. Please try again.'));
      // Log the full error object for debugging
      import('../../lib/logger').then(({ logError }) => {
        logError('Google sign-in exception', error as Error, {
          component: 'GoogleSignInButton',
          action: 'handleGoogleSignIn',
        });
      }).catch(logErr => logger.error('Failed to load logger:', { error: logErr }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className={`flex items-center justify-center gap-3 w-full p-3 border border-border rounded-2xl hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isRTL ? 'flex-row-reverse' : ''
        }`}
        type="button"
      >
        {/* ✅ FIX: Use GoogleIcon component */}
        <GoogleIcon />
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
          className="text-destructive-foreground text-sm text-center p-2 bg-destructive/10 rounded-2xl"
        >
          {error}
        </div>
      )}
    </div>
  );
}
