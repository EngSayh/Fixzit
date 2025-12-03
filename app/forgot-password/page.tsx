'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/contexts/TranslationContext';
import { logger } from '@/lib/logger';
import { BrandLogoWithCard } from '@/components/brand';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send reset email');
      }
      
      setSuccess(true);
    } catch (err) {
      // SECURITY: Always show success to prevent email enumeration attacks.
      // However, we need to distinguish between:
      // 1. User not found (expected, show success for anti-enumeration)
      // 2. Server/network error (unexpected, log for ops visibility)
      const isNetworkError = err instanceof TypeError && err.message.includes('fetch');
      const isServerError = err instanceof Error && err.message.includes('500');
      
      if (isNetworkError || isServerError) {
        // Real infrastructure failure - log at error level for ops visibility
        // but still show success to user for anti-enumeration
        logger.error('Password reset request failed (infrastructure)', { 
          error: err instanceof Error ? err.message : String(err),
          email: email.split('@')[0] + '@***', // Redact domain for logs
          type: isNetworkError ? 'network' : 'server'
        });
      } else {
        // User not found or validation error - expected behavior, warn level
        logger.warn('Password reset request completed (user may not exist)', { 
          email: email.split('@')[0] + '@***' // Redact domain for logs
        });
      }
      
      // Always show success to prevent email enumeration
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-500 via-success to-accent flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {t('forgotPassword.success.title', 'Check Your Email')}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t('forgotPassword.success.message', "We've sent a password reset link to")}{' '}
            <strong>{email}</strong>
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            {t('forgotPassword.success.hint', "Didn't receive the email? Check your spam folder or try again.")}
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={() => setSuccess(false)}
              variant="outline"
              className="w-full"
            >
              {t('forgotPassword.sendAnother', 'Send Another Email')}
            </Button>
            <Link href="/login">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="w-4 h-4 me-2" />
                {t('forgotPassword.backToLogin', 'Back to Login')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 via-success to-accent flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogoWithCard 
              size="lg" 
              alt="Fixzit Logo"
              fetchOrgLogo={false}
              data-testid="forgot-password-logo"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('forgotPassword.title', 'Reset Your Password')}
          </h1>
          <p className="text-muted-foreground">
            {t('forgotPassword.subtitle', "Enter your email address and we'll send you a reset link.")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
              {t('forgotPassword.emailLabel', 'Email Address')}
            </label>
            <div className="relative">
              <Mail className="absolute start-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t('forgotPassword.emailPlaceholder', 'Enter your email address')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ps-10 h-12"
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !email}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold transition-colors"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('forgotPassword.sending', 'Sending Reset Link...')}
              </div>
            ) : (
              t('forgotPassword.submit', 'Send Reset Link')
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-primary hover:text-primary font-medium flex items-center justify-center gap-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('forgotPassword.backToLogin', 'Back to Login')}
          </Link>
        </div>
      </div>
    </div>
  );
}
