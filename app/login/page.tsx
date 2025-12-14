'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// ⚡ PERFORMANCE OPTIMIZATION: Only import icons actually used in login page
import { 
  Eye, EyeOff, LogIn, Mail, Lock, AlertCircle, Check, AlertTriangle,
  User, Shield, Apple
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getCsrfToken, useSession } from 'next-auth/react';
import { useTranslation } from '@/contexts/TranslationContext';
import type { Language } from '@/contexts/TranslationContext';
import LanguageSelector from '@/components/i18n/LanguageSelector';
import CurrencySelector from '@/components/i18n/CurrencySelector';
import { BrandLogoWithCard } from '@/components/brand';
// ⚡ PERFORMANCE OPTIMIZATION: Lazy-load OAuth component (only needed for SSO tab)
import dynamic from 'next/dynamic';

import { logger } from '@/lib/logger';

// Check if OTP is required (matches auth.config.ts logic)
const REQUIRE_SMS_OTP = process.env.NEXT_PUBLIC_REQUIRE_SMS_OTP === 'true';
const SKIP_CSRF = process.env.NEXTAUTH_SKIP_CSRF_CHECK === 'true' || process.env.NODE_ENV === 'test';

// Client-side feature flags: do NOT read secrets here
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true';
const APPLE_ENABLED = process.env.NEXT_PUBLIC_APPLE_ENABLED === 'true';

const GoogleSignInButton = dynamic(
  () => import('@/components/auth/GoogleSignInButton'),
  {
    loading: () => (
      <div className="w-full p-3 border border-border rounded-2xl bg-muted animate-pulse h-12" />
    ),
    ssr: false, // OAuth buttons don't need SSR
  },
);

// ⚡ PERFORMANCE OPTIMIZATION: Lazy-load OTP verification component
const OTPVerification = dynamic(() => import('@/components/auth/OTPVerification'), {
  loading: () => (
    <div className="w-full p-8 bg-muted rounded-2xl animate-pulse h-96" />
  ),
  ssr: false
});

// ⚡ PERFORMANCE OPTIMIZATION: Lazy-load demo credentials section (only needed in dev)
 
const DemoCredentialsSection = dynamic<{
  isRTL: boolean;
  loginMethod: 'personal' | 'corporate' | 'sso';
  quickLogin: (cred: DemoCredential) => void;
  t: (key: string, fallback: string) => string;
}>(() => import('@/components/auth/DemoCredentialsSection').catch(() => ({
  default: () => null // Fallback if component doesn't exist yet
})), {
  loading: () => (
    <div className="mt-6 p-4 bg-muted rounded-2xl animate-pulse h-32" />
  ),
  ssr: false
});

interface FormErrors {
  identifier?: string;
  password?: string;
  general?: string;
  // PHASE-4 FIX: Company code error for corporate login
  companyCode?: string;
}

// OTP state interface
interface OTPState {
  identifier: string;
  maskedPhone: string;
  expiresIn: number;
  devCode?: string | null;
  companyCode?: string | null;
}

// ⚡ PERFORMANCE: Demo credentials moved to lazy-loaded component
interface DemoCredential {
  role: string;
  email?: string;
  employeeNumber?: string;
  password: string;
  description: string;
  icon: typeof Shield;
  color: string;
}

export default function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<'personal' | 'corporate' | 'sso'>('personal');
  const [phoneMode, setPhoneMode] = useState(false);
  const [email, setEmail] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  // PHASE-4 FIX: Add company/org code for corporate login
  const [companyCode, setCompanyCode] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  
  // OTP state
  const [showOTP, setShowOTP] = useState(false);
  const [otpState, setOtpState] = useState<OTPState | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | undefined>();
  const [phoneLoginNotice, setPhoneLoginNotice] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, isRTL, setLanguage, setLocale } = useTranslation();
  const { status } = useSession();
  const isE2E =
    process.env.PLAYWRIGHT === 'true' ||
    process.env.NEXT_PUBLIC_E2E === 'true';

  const identifierLabel = isE2E ? 'Email or Employee Number' : t('login.identifierLabel', 'Email or Employee Number');

  // Auth redirect: bounce authenticated users away from login page
  // SECURITY: Validate redirect target to prevent open redirect attacks
  useEffect(() => {
    if (status === 'authenticated' && !isE2E) {
      const rawTarget = searchParams?.get('callbackUrl') || searchParams?.get('next');
      // Only allow same-origin paths (starts with / but not //)
      const safeTarget = 
        rawTarget && rawTarget.startsWith('/') && !rawTarget.startsWith('//')
          ? rawTarget
          : '/fm/dashboard';
      router.replace(safeTarget);
    }
  }, [status, router, searchParams, isE2E]);

  const redirectTarget = searchParams?.get('next') || searchParams?.get('callbackUrl') || null;
  // Only show demo credentials in development, never in production
  const showDemoCredentials = process.env.NODE_ENV === 'development';
  const submitDisabled =
    loading ||
    (phoneMode
      ? !email.trim()
      : !password ||
        (loginMethod === 'personal' ? !email : !employeeNumber) ||
        (loginMethod === 'corporate' && !companyCode.trim()));

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);
  const employeeRegex = useMemo(() => /^EMP[-A-Z0-9]+$/i, []);
  const isEmployeeId = (value: string) => employeeRegex.test(value.trim());

  // Fetch CSRF token on mount
  useEffect(() => {
    const fetchCsrf = async () => {
      try {
        if (SKIP_CSRF) {
          setCsrfToken('csrf-disabled');
          return;
        }
        const token = await getCsrfToken();
        setCsrfToken(token || undefined);
      } catch (error) {
        logger.error('Failed to fetch CSRF token', error instanceof Error ? error : new Error(String(error)));
      }
    };
    fetchCsrf();
  }, []);

  // Keep language/direction in sync with selected language or ?lang=ar toggle
  useEffect(() => {
    const langParam = searchParams?.get('lang');
    const forceLocale = langParam?.toLowerCase().startsWith('ar') ? 'ar' : undefined;

    if (forceLocale) {
      try {
        setLanguage(forceLocale as Language);
        setLocale(forceLocale);
      } catch {
        // ignore fallback errors
      }
    }

    const dir = forceLocale === 'ar' || isRTL ? 'rtl' : 'ltr';
    if (typeof document !== 'undefined') {
      document.body.setAttribute('dir', dir);
      document.documentElement?.setAttribute('dir', dir);
      document.documentElement?.setAttribute('lang', forceLocale ?? (isRTL ? 'ar' : 'en'));
    }
  }, [isRTL, searchParams, setLanguage, setLocale]);

  // Quick login helper for demo credentials
  const quickLogin = (credential: DemoCredential) => {
    if ('email' in credential && credential.email) {
      setEmail(credential.email);
      setLoginMethod('personal');
    } else if ('employeeNumber' in credential && credential.employeeNumber) {
      setEmployeeNumber(credential.employeeNumber);
      setLoginMethod('corporate');
    }
    setPassword(credential.password);
    setErrors({});
  };

  // Caps lock detection
  useEffect(() => {
    const handleKeyEvent = (e: KeyboardEvent) => {
      if (e.getModifierState) {
        setCapsLockOn(e.getModifierState('CapsLock'));
      }
    };

    const passwordInput = document.getElementById('password');
    if (passwordInput) {
      passwordInput.addEventListener('keydown', handleKeyEvent as EventListener);
      passwordInput.addEventListener('keyup', handleKeyEvent as EventListener);
    }

    return () => {
      if (passwordInput) {
        passwordInput.removeEventListener('keydown', handleKeyEvent as EventListener);
        passwordInput.removeEventListener('keyup', handleKeyEvent as EventListener);
      }
    };
  }, []);

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) setErrors(prev => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

const phoneRegex = useMemo(() => /^\+?[0-9\-()\s]{6,20}$/, []);

  const validateIdentifier = (value: string): string | null => {
    const v = value.trim();
    if (!v) return t('login.errors.emailRequired', 'Email, employee number, or phone is required');
    if (emailRegex.test(v) || employeeRegex.test(v) || phoneRegex.test(v)) return null;
    return t('login.errors.employeeInvalid', 'Enter a valid email, employee number (e.g., EMP-001), or phone number');
  };

  const resolveIdentifier = () => {
    if (phoneMode) {
      return email.trim();
    }
    const candidate = (loginMethod === 'personal' ? email : employeeNumber) || email || employeeNumber;
    return candidate.trim();
  };

  const resolveCompanyCode = () => companyCode.trim().toUpperCase();

  const validatePassword = (value: string): string | null => {
    if (!value) return t('login.errors.passwordRequired', 'Password is required');
    if (value.length < 8) return t('login.errors.passwordTooShort', 'Password must be at least 8 characters');
    return null;
  };

  const validateForm = (): boolean => {
    const next: FormErrors = {};
    
    const identifierErr = validateIdentifier(resolveIdentifier());
    if (identifierErr) next.identifier = identifierErr;
    
    // Skip password validation for phone OTP mode (password field is disabled)
    if (!phoneMode) {
      const pwErr = validatePassword(password);
      if (pwErr) next.password = pwErr;
    }
    
    // PHASE-4 FIX: Require company code for corporate login
    if (loginMethod === 'corporate' && !companyCode.trim()) {
      next.companyCode = t('login.errors.companyRequired', 'Company number is required for corporate login');
    }
    
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // [CODE REVIEW FIX]: Simplified redirect logic - fall back to /dashboard
  // (FM-specific routing for authenticated users is handled by middleware)
  // The dashboard page will handle role-based redirects (TENANT -> /fm/properties, VENDOR -> /fm/marketplace)
  const postLoginRedirect = (): string => {
    if (redirectTarget && redirectTarget.startsWith('/') && !redirectTarget.startsWith('//')) {
      return redirectTarget;
    }
    return '/fm/dashboard';
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loginMethod === 'sso') return;

    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const rawIdentifier = resolveIdentifier();
      const identifier = isEmployeeId(rawIdentifier) ? rawIdentifier.toUpperCase() : rawIdentifier;
      const normalizedCompanyCode = loginMethod === 'corporate' ? resolveCompanyCode() : undefined;
      const ensureCsrfToken = async () => {
        if (csrfToken) return csrfToken;
        if (SKIP_CSRF) return 'csrf-disabled';
        try {
          const token = await getCsrfToken();
          setCsrfToken(token || undefined);
          return token || undefined;
        } catch (err) {
          logger.error('Failed to refresh CSRF token before login', err instanceof Error ? err : new Error(String(err)));
          return undefined;
        }
      };
      let tokenToUse = await ensureCsrfToken();

      // If OTP not required, login directly without SMS verification
      if (!REQUIRE_SMS_OTP) {
        if (!tokenToUse) {
          tokenToUse = 'csrf-disabled';
        }

        // PHASE-4 FIX: Include companyCode in credentials for corporate login
        const result = await signIn('credentials', {
          identifier,
          password,
          rememberMe,
          csrfToken: tokenToUse,
          redirect: false,
          // Corporate login requires company code for org disambiguation
          ...(normalizedCompanyCode ? { companyCode: normalizedCompanyCode } : {}),
        });

        if (result?.error) {
          // 🔒 PORTAL SEPARATION FIX: Auto-redirect superadmin to correct portal
          if (result.error === 'SUPERADMIN_WRONG_PORTAL') {
            // Silent redirect (no console log to avoid exposing superadmin path in production)
            router.replace('/superadmin/login');
            return;
          }
          
          if (result.error === 'EMAIL_NOT_VERIFIED') {
            setPendingVerificationEmail(identifier);
            setErrors({
              general: t('login.errors.emailNotVerified', 'Your email is not verified. Please check your inbox or resend verification.'),
            });
          } else if (result.error === 'ACCOUNT_LOCKED') {
            setErrors({
              general: t('login.errors.accountLocked', 'Your account is locked due to too many failed attempts. Try again later or contact support.'),
            });
          } else {
            setErrors({
              general: t('login.errors.invalidCredentials', 'Invalid email/employee number or password')
            });
          }
          setLoading(false);
          return;
        }

        if (result?.ok) {
        try {
          await fetch("/api/auth/post-login", { method: "POST", credentials: "include" });
        } catch {
          // ignore
        }
        setSuccess(true);
        const redirectTo = postLoginRedirect();
        setTimeout(() => {
          router.replace(redirectTo);
        }, 500);
        }
        return;
      }

      // Step 1: Send OTP to user's phone (only when OTP is required)
      // PHASE-4 FIX: Include companyCode for corporate login org disambiguation
      const otpResponse = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          identifier, 
          password,
          ...(normalizedCompanyCode ? { companyCode: normalizedCompanyCode } : {}),
        }),
      });

      const otpData = await otpResponse.json();

      if (!otpResponse.ok) {
        // Handle OTP send errors
        if (otpResponse.status === 401) {
          setErrors({
            general: t('login.errors.invalidCredentials', 'Invalid email/employee number or password')
          });
        } else if (otpResponse.status === 429) {
          setErrors({
            general: t('login.errors.rateLimited', 'Too many attempts. Please try again later.')
          });
        } else if (otpResponse.status === 400 && otpData.error?.includes('phone')) {
          setErrors({
            general: t('login.errors.noPhone', 'No phone number registered. Please contact support.')
          });
        } else {
          setErrors({
            general: t('login.errors.otpFailed', 'Failed to send verification code. Please try again.')
          });
        }
        setLoading(false);
        return;
      }

      // Step 2: Show OTP verification screen
      setOtpState({
        identifier,
        maskedPhone: otpData.data.phone,
        expiresIn: otpData.data.expiresIn,
        devCode: otpData.data.devCode ?? null,
        companyCode: loginMethod === 'corporate' ? normalizedCompanyCode : null,
      });
      setShowOTP(true);
      setLoading(false);
    } catch (err) {
      logger.error(
        'Login error',
        err instanceof Error ? err : new Error(String(err)),
        { route: '/login' }
      );
      setErrors({ general: t('login.errors.networkError', 'Network error. Please check your connection.') });
      setLoading(false);
    }
  }

  // Handle OTP verification success
  const handleOTPVerified = async (otpToken: string) => {
    setLoading(true);

    try {
      let tokenToUse = csrfToken;
      if (!tokenToUse) {
        if (SKIP_CSRF) {
          tokenToUse = 'csrf-disabled';
        } else {
          tokenToUse = await getCsrfToken();
          setCsrfToken(tokenToUse || undefined);
        }
      }
      if (!tokenToUse) {
        tokenToUse = 'csrf-disabled';
      }

      // Use NextAuth signIn with credentials provider (skip OTP this time)
      const identifierRaw =
        otpState?.identifier || resolveIdentifier();
      const identifier = isEmployeeId(identifierRaw) ? identifierRaw.toUpperCase() : identifierRaw;
      const isCorporateFlow = loginMethod === 'corporate' || Boolean(otpState?.companyCode);
      const codeForLogin = isCorporateFlow
        ? (otpState?.companyCode || resolveCompanyCode())
        : undefined;
      
      const result = await signIn('credentials', {
        identifier,
        password,
        rememberMe,
        otpToken,
        csrfToken: tokenToUse,
        redirect: false,
        ...(isCorporateFlow && codeForLogin
          ? { companyCode: codeForLogin }
          : {}),
      });

        if (result?.error) {
          // 🔒 PORTAL SEPARATION FIX: Auto-redirect superadmin to correct portal
          if (result.error === 'SUPERADMIN_WRONG_PORTAL') {
            // Silent redirect (no console log to avoid exposing superadmin path in production)
            router.replace('/superadmin/login');
            return;
          }
          
          if (result.error === 'EMAIL_NOT_VERIFIED') {
            setPendingVerificationEmail(identifier);
            setErrors({
              general: t('login.errors.emailNotVerified', 'Your email is not verified. Please check your inbox or resend verification.'),
            });
          } else if (result.error === 'ACCOUNT_LOCKED') {
            setErrors({
              general: t('login.errors.accountLocked', 'Your account is locked due to too many failed attempts. Try again later or contact support.'),
            });
          } else {
            setErrors({
              general: t('login.errors.loginFailed', 'Login failed. Please try again.')
            });
          }
          setLoading(false);
          setShowOTP(false);
          return;
        }
      
      // Persist refreshed CSRF token for subsequent operations
      if (!csrfToken && tokenToUse) {
        setCsrfToken(tokenToUse);
      }

      if (result?.ok) {
        try {
          await fetch("/api/auth/post-login", { method: "POST", credentials: "include" });
        } catch {
          // ignore
        }
        setSuccess(true);
        const redirectTo = postLoginRedirect();

        setTimeout(() => {
          router.replace(redirectTo);
        }, 500);
      }
    } catch (err) {
      logger.error(
        'Post-OTP login error',
        err instanceof Error ? err : new Error(String(err))
      );
      setErrors({ general: t('login.errors.networkError', 'Network error. Please check your connection.') });
      setLoading(false);
      setShowOTP(false);
    }
  };

  const handleOTPResend = async () => {
    const identifierRaw = otpState?.identifier || resolveIdentifier();
    const identifier = isEmployeeId(identifierRaw) ? identifierRaw.toUpperCase() : identifierRaw;
    const isCorporateFlow = loginMethod === 'corporate' || Boolean(otpState?.companyCode);
    const resendCompanyCode =
      isCorporateFlow
        ? (otpState?.companyCode || resolveCompanyCode())
        : undefined;

    if (!identifier) {
      setShowOTP(false);
      setOtpState(null);
      return {
        success: false,
        error: t('otp.errors.sessionExpired', 'Your verification session expired. Please sign in again.'),
      };
    }

    try {
      // AUDIT-2025-11-26: Include companyCode in OTP resend for corporate login
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          identifier, 
          ...(phoneMode ? {} : { password }),
          ...(resendCompanyCode ? { companyCode: resendCompanyCode } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          return {
            success: false,
            error: t('login.errors.rateLimited', 'Too many attempts. Please try again later.'),
          };
        }

        if (response.status === 401) {
          return {
            success: false,
            error: t('login.errors.invalidCredentials', 'Invalid email/employee number or password'),
          };
        }

        return {
          success: false,
          error: data.error || t('otp.errors.resendFailed', 'Failed to resend OTP'),
        };
      }

      setOtpState((prev) =>
        prev
          ? {
              ...prev,
              maskedPhone: data.data.phone || prev.maskedPhone,
              expiresIn: data.data.expiresIn,
              devCode: data.data.devCode ?? prev.devCode,
            }
          : null
      );

      return {
        success: true,
        expiresIn: data.data.expiresIn,
      };
    } catch (err) {
      logger.error('OTP resend error', err instanceof Error ? err : new Error(String(err)));
      return {
        success: false,
        error: t('otp.errors.networkError', 'Network error. Please try again.'),
      };
    }
  };

  // Handle back from OTP screen
  const handleOTPBack = () => {
    setShowOTP(false);
    setOtpState(null);
    setPassword('');
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) return;
    try {
      const res = await fetch("/api/auth/verify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingVerificationEmail }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrors({
          general:
            data.error ||
            t(
              "login.errors.resendVerificationFailed",
              "Failed to resend verification. Please try again.",
            ),
        });
        return;
      }
      setErrors({
        general: t(
          "login.errors.verificationResent",
          "Verification email sent. Please check your inbox.",
        ),
      });
    } catch (_error) {
      setErrors({
        general: t(
          "login.errors.resendVerificationFailed",
          "Failed to resend verification. Please try again.",
        ),
      });
    }
  };

  // Success state
  if (success) {
    return (
      <main id="main-content" role="main" className="min-h-screen bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {t('login.success.title', 'Welcome Back!')}
          </h2>
          <p className="text-muted-foreground mb-4">
            {t('login.success.message', 'Signing you in...')}
          </p>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" role="main" className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Language/Currency Selectors */}
        <div className={`flex items-center justify-end gap-2 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <LanguageSelector variant="compact" />
          <CurrencySelector variant="compact" />
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-xl p-8">
          {/* Show OTP verification or login form */}
          {showOTP && otpState ? (
            <OTPVerification
              identifier={otpState.identifier}
              companyCode={otpState.companyCode || (loginMethod === 'corporate' ? resolveCompanyCode() : undefined)}
              maskedPhone={otpState.maskedPhone}
              expiresIn={otpState.expiresIn}
              devCode={otpState.devCode || undefined}
              onVerified={handleOTPVerified}
              onResend={handleOTPResend}
              onBack={handleOTPBack}
              t={t}
              isRTL={isRTL}
            />
          ) : (
            <>
              {/* Logo */}
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <BrandLogoWithCard 
                    size="lg" 
                    alt="Fixzit Logo"
                    fetchOrgLogo={false}
                    data-testid="login-logo"
                  />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {t('login.welcome', 'Welcome Back')}
                </h1>
                <p className="text-muted-foreground">
                  {t('login.subtitle', 'Sign in to your Fixzit account')}
                </p>
              </div>

          {/* Login Method Tabs */}
          <div className={`flex bg-muted rounded-2xl p-1 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              type="button"
              onClick={() => setLoginMethod('personal')}
              className={`flex-1 py-2 px-4 rounded-2xl text-sm font-medium transition-colors ${
                loginMethod === 'personal'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('login.personalEmailTab', 'Personal Email')}
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('corporate')}
              className={`flex-1 py-2 px-4 rounded-2xl text-sm font-medium transition-colors ${
                loginMethod === 'corporate'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('login.corporateAccountTab', 'Corporate Account')}
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('sso')}
              className={`flex-1 py-2 px-4 rounded-2xl text-sm font-medium transition-colors ${
                loginMethod === 'sso'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('login.ssoLoginTab', 'SSO Login')}
            </button>
          </div>
          <div className="flex items-center gap-2 mb-6 text-sm">
            <input
              type="checkbox"
              id="phoneMode"
              checked={phoneMode}
              onChange={(e) => {
                setPhoneMode(e.target.checked);
                setEmail('');
                setEmployeeNumber('');
              }}
              className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
            />
            <label htmlFor="phoneMode" className="text-foreground">
              {t('login.phoneMode', 'Use phone number with OTP (no password)')}
            </label>
          </div>

          {/* Form - Personal & Corporate */}
          {(loginMethod === 'personal' || loginMethod === 'corporate') && (
            <form onSubmit={onSubmit} className="space-y-5" noValidate data-testid="login-form">
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                {loginMethod === 'personal'
                  ? t('login.helper.personal', 'Use your email and password to sign in to your personal account.')
                  : t('login.helper.corporate', 'Use your Company ID + Employee ID + password for corporate access.')}
              </div>
              {pendingVerificationEmail && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-800 px-3 py-2 text-sm">
                  {t(
                    'login.errors.emailNotVerified',
                    'Your email is not verified. Please check your inbox or resend verification.',
                  )}
                </div>
              )}

              {/* PHASE-4 FIX: Company Code Field for Corporate Login */}
              {loginMethod === 'corporate' && (
                <div>
                  <label htmlFor="companyCode" className="block text-sm font-medium text-foreground mb-2">
                    {t('login.companyNumber', 'Company Number')}
                  </label>
                  <div className="relative">
                    <Shield className={`absolute ${isRTL ? 'end-3' : 'start-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                    <Input
                      id="companyCode"
                      name="companyCode"
                      data-testid="login-company-code"
                      type="text"
                      inputMode="text"
                      enterKeyHint="next"
                      autoComplete="organization"
                      placeholder={t('login.enterCompanyNumber', 'Enter your company number (e.g., ORG-001)')}
                      value={companyCode}
                      onChange={(e) => {
                        setCompanyCode(e.target.value);
                        clearError('companyCode');
                        clearError('general');
                      }}
                      className={`${isRTL ? 'pe-10' : 'ps-10'} h-12 ${errors.companyCode ? 'border-destructive focus:ring-destructive' : ''}`}
                      aria-invalid={!!errors.companyCode}
                      aria-describedby={errors.companyCode ? 'companyCode-error' : undefined}
                      disabled={loading || phoneMode}
                      autoFocus
                      required={!phoneMode}
                    />
                  </div>
                  {errors.companyCode && (
                    <p id="companyCode-error" className="mt-1 text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.companyCode}
                    </p>
                  )}
                </div>
              )}

              {/* Email or Employee Number */}
              <div>
                <label htmlFor={loginMethod === 'personal' ? 'email' : 'employeeNumber'} className="block text-sm font-medium text-foreground mb-2">
                  {identifierLabel}
                </label>
                <div className="relative">
                  {loginMethod === 'personal' ? (
                    <Mail className={`absolute ${isRTL ? 'end-3' : 'start-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                  ) : (
                    <User className={`absolute ${isRTL ? 'end-3' : 'start-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                  )}
                  <Input
                    id={loginMethod === 'personal' ? 'email' : 'employeeNumber'}
                    name="identifier"
                    data-testid="login-email"
                    type="text"
                    aria-label={identifierLabel}
                    inputMode={phoneMode ? 'tel' : loginMethod === 'personal' ? 'email' : 'text'}
                    enterKeyHint="next"
                    autoComplete={phoneMode ? 'tel' : loginMethod === 'personal' ? 'email' : 'username'}
                    placeholder={
                      phoneMode
                        ? t('login.enterPhone', 'Enter your phone number')
                        : loginMethod === 'personal'
                          ? t('login.enterEmail', 'Enter your personal email')
                          : t('login.enterEmployeeNumber', 'Enter your employee number')
                    }
                    value={phoneMode ? email : loginMethod === 'personal' ? email : employeeNumber}
                    onChange={(e) => {
                      if (phoneMode) {
                        setEmail(e.target.value);
                      } else if (loginMethod === 'personal') {
                        setEmail(e.target.value);
                      } else {
                        setEmployeeNumber(e.target.value);
                      }
                      clearError('identifier');
                      clearError('general');
                    }}
                    className={`${isRTL ? 'pe-10' : 'ps-10'} h-12 ${errors.identifier ? 'border-destructive focus:ring-destructive' : ''}`}
                    aria-invalid={!!errors.identifier}
                    aria-describedby={errors.identifier ? 'identifier-error' : undefined}
                    disabled={loading}
                    autoFocus={loginMethod === 'personal'}
                    required
                  />
                </div>
                {loginMethod === 'corporate' && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t('login.corporateHelp', 'Enter your company number, employee number, and password to sign in.')}
                  </p>
                )}
                {errors.identifier && (
                  <p id="identifier-error" className="mt-1 text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.identifier}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                {!phoneMode && (
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-medium text-foreground">
                      {t('common.password', 'Password')}
                    </label>
                    <Link href="/forgot-password" className="text-sm text-primary hover:text-primary transition-colors">
                      {t('common.forgotPassword', 'Forgot?')}
                    </Link>
                  </div>
                )}
                <div className="relative">
                  <Lock className={`absolute ${isRTL ? 'end-3' : 'start-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                  <Input
                    id="password"
                    name="password"
                    data-testid="login-password"
                    type={showPassword ? 'text' : 'password'}
                    inputMode="text"
                    enterKeyHint="send"
                    autoComplete="current-password"
                    placeholder={t('login.enterPassword', 'Enter your password')}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError('password');
                      clearError('general');
                    }}
                    className={`${isRTL ? 'pe-10 ps-10' : 'ps-10 pe-10'} h-12 ${errors.password ? 'border-destructive focus:ring-destructive' : ''}`}
                    style={{ direction: 'ltr' }}
                    aria-invalid={!!errors.password}
                    disabled={loading || phoneMode}
                    required={!phoneMode}
                  />
                  {!phoneMode && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className={`absolute ${isRTL ? 'start-3' : 'end-3'} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground`}
                      aria-label={showPassword ? t('login.hidePassword', 'Hide password') : t('login.showPassword', 'Show password')}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  )}
                </div>
                {capsLockOn && (
                  <p className="mt-1 text-sm text-warning flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {t('login.capsLockOn', 'Caps Lock is on')}
                  </p>
                )}
                {errors.password && (
                  <p className="mt-1 text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Remember Me */}
              {!phoneMode && (
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                    disabled={loading}
                  />
                  <label htmlFor="rememberMe" className="text-sm text-foreground cursor-pointer select-none">
                    {t('login.rememberMe', 'Remember me for 30 days')}
                  </label>
                </div>
              )}

          {/* Phone OTP prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {t('login.phoneOtp.prompt', 'Prefer phone OTP?')}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  setLoginMethod('personal');
                  setPhoneLoginNotice(
                    t(
                      'login.phoneOtp.notice',
                      'Enter your phone in the email field and submit to receive an OTP.',
                    ),
                  );
                }}
              >
                {t('login.phoneOtp.cta', 'Use phone OTP')}
              </Button>
            </div>
            {phoneLoginNotice && (
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {phoneLoginNotice}
              </div>
            )}
          </div>

              {/* General Error */}
              {errors.general && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className={`flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{errors.general}</span>
                </div>
              )}
              {pendingVerificationEmail && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    {t(
                      "login.verificationPending",
                      "Email verification required. Resend the verification link to proceed.",
                    )}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleResendVerification}
                  >
                    {t("login.resendVerification", "Resend")}
                  </Button>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                data-testid="login-submit"
                aria-disabled={submitDisabled}
                className={`w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold transition-colors ${submitDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          )}

          {/* SSO Login Options */}
          {loginMethod === 'sso' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {GOOGLE_ENABLED && <GoogleSignInButton />}
                {APPLE_ENABLED ? (
                  <button 
                    type="button"
                    className={`flex items-center justify-center gap-3 w-full p-3 border border-border rounded-2xl hover:bg-muted transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Apple className="h-5 w-5 text-foreground" />
                    <span>{t('login.continueWith', 'Continue with')} Apple</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className={`flex items-center justify-center gap-3 w-full p-3 border border-dashed rounded-2xl text-muted-foreground bg-muted/50 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Apple className="h-5 w-5 text-muted-foreground" />
                    <span>{t('login.appleUnavailable', 'Apple login not configured')}</span>
                  </button>
                )}
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-card text-muted-foreground">{t('login.orUseAccount', 'Or use account')}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLoginMethod('personal')}
                className="w-full py-2 text-primary hover:text-primary font-medium transition-colors"
              >
                {t('login.usePersonalEmail', 'Use Personal Email')}
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('corporate')}
                className="w-full py-2 text-primary hover:text-primary font-medium transition-colors"
              >
                {t('login.useCorporateAccount', 'Use Corporate Account')}
              </button>
            </div>
          )}
          </>
          )}

          {/* Demo Credentials - Lazy loaded for better performance */}
          {showDemoCredentials && loginMethod !== 'sso' && !showOTP && (
            <DemoCredentialsSection 
              isRTL={isRTL}
              loginMethod={loginMethod}
              quickLogin={quickLogin}
              t={t}
            />
          )}

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              {t('login.noAccount', "Don't have an account?")}{' '}
              <Link href="/signup" className="text-primary hover:text-primary font-medium transition-colors">
                {t('login.signUp', 'Sign up here')}
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-6 text-center">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t('common.backToHome', 'Back to Home')}
          >
            {isRTL ? '→' : '←'} {t('common.backToHome', 'Back to Home')}
          </Link>
        </div>
      </div>
    </main>
  );
}
