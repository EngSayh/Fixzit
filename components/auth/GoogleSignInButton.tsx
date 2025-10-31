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
        // Log only safe error details (no PII, tokens, or sensitive data)
        console.error('Google sign-in failed:', {
          hasError: true,
          // Only log error type/code if available, never the full error object
          errorType: typeof result.error === 'string' ? 'string' : 'object'
        });
      } else if (result?.ok) {
        // Successfully signed in, navigate to dashboard
        router.push(result.url || '/dashboard');
      }
    } catch (error) {
      // Log only a sanitized error message, never the full error object (may contain PII)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Google sign-in exception:', { message: errorMessage });
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
        className={`flex items-center justify-center gap-3 w-full p-3 border border-border rounded-2xl hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
          className="text-red-600 text-sm text-center p-2 bg-red-50 rounded-2xl"
        >
          {error}
        </div>
      )}
    </div>
  );
}
