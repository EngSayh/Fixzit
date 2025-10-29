'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, LogIn, Mail, Lock, AlertCircle, Check, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import LanguageSelector from '@/components/i18n/LanguageSelector';
import CurrencySelector from '@/components/i18n/CurrencySelector';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

interface FormErrors {
  identifier?: string;
  password?: string;
  general?: string;
}

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, isRTL } = useTranslation();

  // Get redirect target from query params (?next= or ?callbackUrl=)
  const redirectTarget = searchParams.get('next') || searchParams.get('callbackUrl') || null;

  const showDemoLink =
    process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true' || process.env.NODE_ENV === 'development';

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);
  const empRegex = useMemo(() => /^EMP\d+$/i, []);

  // Detect identifier type for dynamic inputMode
  const identifierType: 'email' | 'text' | 'numeric' = useMemo(() => {
    const trimmed = identifier.trim();
    if (!trimmed) return 'text';
    if (emailRegex.test(trimmed)) return 'email';
    if (/^\d+$/.test(trimmed)) return 'numeric';
    return 'text';
  }, [identifier, emailRegex]);

  // Caps lock detection on password field
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.getModifierState && e.getModifierState('CapsLock')) {
        setCapsLockOn(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.getModifierState && !e.getModifierState('CapsLock')) {
        setCapsLockOn(false);
      }
    };

    // Attach listeners to password field when it's focused
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
      passwordInput.addEventListener('keydown', handleKeyDown as EventListener);
      passwordInput.addEventListener('keyup', handleKeyUp as EventListener);
    }

    return () => {
      if (passwordInput) {
        passwordInput.removeEventListener('keydown', handleKeyDown as EventListener);
        passwordInput.removeEventListener('keyup', handleKeyUp as EventListener);
      }
    };
  }, []);

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) setErrors(prev => {
      const copy = { ...prev }; delete copy[field]; return copy;
    });
  };

  const validateIdentifier = (value: string): string | null => {
    const v = value.trim();
    if (!v) return t('login.errors.identifierRequired', 'Email or employee number is required');
    if (!emailRegex.test(v) && !empRegex.test(v)) {
      return t('login.errors.identifierInvalid', 'Enter a valid email or employee number (e.g., EMP001)');
    }
    return null;
  };

  const validatePassword = (value: string): string | null => {
    if (!value) return t('login.errors.passwordRequired', 'Password is required');
    if (value.length < 8) return t('login.errors.passwordTooShort', 'Password must be at least 8 characters');
    return null;
  };

  const validateForm = (): boolean => {
    const next: FormErrors = {};
    const idErr = validateIdentifier(identifier);
    if (idErr) next.identifier = idErr;
    const pwErr = validatePassword(password);
    if (pwErr) next.password = pwErr;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const postLoginRouteFor = (role?: string): string => {
    // Prioritize redirectTarget from query params
    if (redirectTarget) {
      // Security: Validate that redirect is relative (starts with /) to prevent open redirects
      if (redirectTarget.startsWith('/') && !redirectTarget.startsWith('//')) {
        return redirectTarget;
      }
    }

    const r = (role || '').toUpperCase();
    if (r === 'SUPER_ADMIN' || r === 'CORPORATE_ADMIN' || r === 'FM_MANAGER') return '/fm/dashboard';
    if (r === 'TENANT') return '/fm/properties';
    if (r === 'VENDOR') return '/fm/marketplace';
    return '/fm/dashboard';
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});
    try {
      const id = identifier.trim();
      // Build payload explicitly for backend contract
      const payload =
        emailRegex.test(id)
          ? { email: id, password, rememberMe, loginType: 'personal' as const }
          : { employeeNumber: id, password, rememberMe, loginType: 'corporate' as const };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      // Try JSON, fall back to generic object
      let data: { ok?: boolean; status?: number; error?: string; fieldErrors?: FormErrors; user?: { role?: string }; redirectTo?: string; preferredPath?: string } = {};
      try { data = await res.json(); } catch { data = { ok: res.ok, status: res.status }; }

      if (!res.ok) {
        if (res.status === 401) {
          setErrors({ general: data.error || t('login.errors.invalidCredentials', 'Invalid email/employee number or password') });
        } else if (res.status === 429) {
          setErrors({ general: t('login.errors.tooManyAttempts', 'Too many login attempts. Please try again later.') });
        } else if (res.status === 400 && data.fieldErrors) {
          setErrors(data.fieldErrors);
        } else {
          setErrors({ general: data.error || t('login.errors.loginFailed', 'Login failed. Please try again.') });
        }
        return;
      }

      if (data?.ok !== false) {
        if (data.user?.role) {
          try { localStorage.setItem('fixzit-role', data.user.role); } catch { /* ignore */ }
        }
        setSuccess(true);

        const redirectTo: string =
          data?.redirectTo ||
          data?.preferredPath ||
          postLoginRouteFor(data?.user?.role);

        setTimeout(() => {
          // replace to avoid leaving /login in history
          router.replace(redirectTo);
        }, 800);
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrors({ general: t('login.errors.networkError', 'Network error. Please check your connection and try again.') });
    } finally {
      setLoading(false);
    }
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('login.success.title', 'Welcome Back!')}
          </h2>
          <p className="text-gray-600 mb-4">
            {t('login.success.message', 'Signing you in...')}
          </p>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Language/Currency Selectors */}
        <div className={`flex items-center justify-end gap-2 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <LanguageSelector variant="compact" />
          <CurrencySelector variant="compact" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-xl mb-4">
              <span className="text-white text-2xl font-bold">F</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('login.welcome', 'Welcome Back')}
            </h1>
            <p className="text-gray-600">
              {t('login.subtitle', 'Sign in to your Fixzit account')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-5" noValidate data-testid="login-form">
            {/* Identifier */}
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
                {t('login.identifier', 'Email or Employee Number')}
              </label>
              <div className="relative">
                <Mail className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400`} />
                <Input
                  id="identifier"
                  data-testid="login-email"
                  name="identifier"
                  type="text"
                  inputMode={identifierType}
                  enterKeyHint="next"
                  autoComplete="username email"
                  placeholder={t('login.identifierPlaceholder', 'you@example.com or EMP001')}
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); clearError('identifier'); clearError('general'); }}
                  className={`${isRTL ? 'pr-10 text-right' : 'pl-10'} h-12 ${errors.identifier ? 'border-red-500 focus:ring-red-500' : ''}`}
                  aria-invalid={!!errors.identifier}
                  aria-describedby={errors.identifier ? 'identifier-error' : 'identifier-hint'}
                  disabled={loading}
                  autoFocus
                  required
                />
              </div>
              <p id="identifier-hint" className="mt-1 text-xs text-gray-500">
                {t('login.identifierHint', 'Enter your email address or employee number (EMP001, EMP002, etc.)')}
              </p>
              {empRegex.test(identifier.trim()) && !errors.identifier && (
                <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {t('login.corporateHelp', 'Use Employee Number + Password. No separate Corporate Number field needed.')}
                </p>
              )}
              {errors.identifier && (
                <p id="identifier-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.identifier}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {t('common.password', 'Password')}
                </label>
                <Link href="/forgot-password" className="text-sm text-brand-500 hover:text-brand-600 transition-colors">
                  {t('common.forgotPassword', 'Forgot?')}
                </Link>
              </div>
              <div className="relative">
                <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400`} />
                <Input
                  id="password"
                  data-testid="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  inputMode="text"
                  enterKeyHint="send"
                  autoComplete="current-password"
                  placeholder={t('login.passwordPlaceholder', 'Enter your password')}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError('password'); clearError('general'); }}
                  className={`${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} h-12 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                  style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : capsLockOn ? 'caps-lock-warning' : undefined}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600`}
                  aria-label={showPassword ? t('login.hidePassword', 'Hide password') : t('login.showPassword', 'Show password')}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {capsLockOn && (
                <p id="caps-lock-warning" className="mt-1 text-sm text-yellow-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {t('login.capsLockOn', 'Caps Lock is on')}
                </p>
              )}
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                disabled={loading}
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-700 cursor-pointer select-none">
                {t('login.rememberMe', 'Remember me for 30 days')}
              </label>
            </div>

            {/* General Error */}
            {errors.general && (
              <div
                role="alert"
                aria-live="assertive"
                className={`flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{errors.general}</span>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              data-testid="login-submit"
              disabled={loading || !identifier || !password}
              className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('login.signingIn', 'Signing in...')}
                </div>
              ) : (
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <LogIn className="h-5 w-5" />
                  {t('login.signIn', 'Sign In')}
                </div>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                {t('login.orContinueWith', 'Or continue with')}
              </span>
            </div>
          </div>

          {/* SSO */}
          <div className="space-y-3">
            <GoogleSignInButton />
          </div>

          {/* Sign Up */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              {t('login.noAccount', "Don't have an account?")}{' '}
              <Link href="/signup" className="text-brand-500 hover:text-brand-600 font-medium transition-colors">
                {t('login.signUp', 'Sign up here')}
              </Link>
            </p>
          </div>

          {/* Dev Helpers (dev only) */}
          {showDemoLink && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link
                href="/login-helpers"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-1"
              >
                <span>🔧</span>
                {t('login.devHelpers', 'Developer? Access test accounts')}
              </Link>
            </div>
          )}
        </div>

        {/* Footer Link */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            {t('login.backToHome', isRTL ? 'العودة للرئيسية ←' : '← Back to Home')}
          </Link>
        </div>
      </div>
    </div>
  );
}
