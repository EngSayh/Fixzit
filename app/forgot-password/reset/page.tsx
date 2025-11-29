'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? null;
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [tokenValid, setTokenValid] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const { t } = useTranslation();

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError(t('resetPassword.errors.noToken', 'Invalid or missing reset token'));
        setValidating(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (data.valid) {
          setTokenValid(true);
          setMaskedEmail(data.email || '');
        } else {
          setError(data.error || t('resetPassword.errors.invalidToken', 'Invalid or expired reset link'));
        }
      } catch (_err) {
        setError(t('resetPassword.errors.validation', 'Failed to validate reset link'));
      } finally {
        setValidating(false);
      }
    }

    validateToken();
  }, [token, t]);

  // Validate password requirements
  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) {
      errors.push(t('resetPassword.validation.minLength', 'At least 8 characters'));
    }
    if (!/[A-Za-z]/.test(pwd)) {
      errors.push(t('resetPassword.validation.letter', 'At least one letter'));
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push(t('resetPassword.validation.number', 'At least one number'));
    }
    if (!/[^A-Za-z0-9]/.test(pwd)) {
      errors.push(t('resetPassword.validation.special', 'At least one special character'));
    }
    return errors;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setValidationErrors(validatePassword(newPassword));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    const pwdErrors = validatePassword(password);
    if (pwdErrors.length > 0) {
      setValidationErrors(pwdErrors);
      return;
    }
    
    if (password !== confirmPassword) {
      setError(t('resetPassword.errors.mismatch', 'Passwords do not match'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('resetPassword.errors.failed', 'Failed to reset password'));
    } finally {
      setLoading(false);
    }
  };

  // Loading state while validating token
  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-500 via-success to-accent flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {t('resetPassword.validating', 'Validating your reset link...')}
          </p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid && !validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-500 via-success to-accent flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {t('resetPassword.invalidTitle', 'Invalid Reset Link')}
          </h1>
          <p className="text-muted-foreground mb-6">
            {error || t('resetPassword.invalidMessage', 'This password reset link is invalid or has expired.')}
          </p>
          
          <div className="space-y-3">
            <Link href="/forgot-password">
              <Button className="w-full">
                {t('resetPassword.requestNew', 'Request New Reset Link')}
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="w-4 h-4 me-2" />
                {t('resetPassword.backToLogin', 'Back to Login')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-500 via-success to-accent flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {t('resetPassword.success.title', 'Password Reset Successfully')}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t('resetPassword.success.message', 'Your password has been reset. You can now log in with your new password.')}
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            {t('resetPassword.success.redirect', 'Redirecting to login...')}
          </p>
          
          <Link href="/login">
            <Button className="w-full">
              <ArrowLeft className="w-4 h-4 me-2" />
              {t('resetPassword.goToLogin', 'Go to Login')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 via-success to-accent flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('resetPassword.title', 'Create New Password')}
          </h1>
          {maskedEmail && (
            <p className="text-muted-foreground text-sm">
              {t('resetPassword.forEmail', 'For account:')} {maskedEmail}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
              {t('resetPassword.newPassword', 'New Password')}
            </label>
            <div className="relative">
              <Lock className="absolute start-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('resetPassword.passwordPlaceholder', 'Enter new password')}
                value={password}
                onChange={handlePasswordChange}
                className="ps-10 pe-10 h-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            
            {/* Password requirements */}
            {password && validationErrors.length > 0 && (
              <div className="mt-2 space-y-1">
                {validationErrors.map((err, idx) => (
                  <p key={idx} className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {err}
                  </p>
                ))}
              </div>
            )}
            {password && validationErrors.length === 0 && (
              <p className="mt-2 text-sm text-success flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {t('resetPassword.passwordStrong', 'Password meets requirements')}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
              {t('resetPassword.confirmPassword', 'Confirm New Password')}
            </label>
            <div className="relative">
              <Lock className="absolute start-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t('resetPassword.confirmPlaceholder', 'Confirm new password')}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                className="ps-10 pe-10 h-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute end-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-2 text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {t('resetPassword.errors.mismatch', 'Passwords do not match')}
              </p>
            )}
            {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && (
              <p className="mt-2 text-sm text-success flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {t('resetPassword.passwordsMatch', 'Passwords match')}
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || validationErrors.length > 0 || password !== confirmPassword || !password}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold transition-colors"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('resetPassword.resetting', 'Resetting Password...')}
              </div>
            ) : (
              t('resetPassword.submit', 'Reset Password')
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-primary hover:text-primary font-medium flex items-center justify-center gap-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('resetPassword.backToLogin', 'Back to Login')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-brand-500 via-success to-accent flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
