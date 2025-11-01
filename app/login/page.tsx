'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Eye, EyeOff, LogIn, Mail, Lock, AlertCircle, Check, AlertTriangle,
  User, Shield, Building2, Users, ArrowRight, Apple
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useTranslation } from '@/contexts/TranslationContext';
import { STORAGE_KEYS } from '@/config/constants';
import LanguageSelector from '@/components/i18n/LanguageSelector';
import CurrencySelector from '@/components/i18n/CurrencySelector';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

interface FormErrors {
  identifier?: string;
  password?: string;
  general?: string;
}

const DEMO_CREDENTIALS = [
  {
    role: 'Super Admin',
    email: 'superadmin@fixzit.co',
    password: 'password123',
    description: 'Full system access',
    icon: Shield,
    color: 'bg-red-100 text-red-800'
  },
  {
    role: 'Admin',
    email: 'admin@fixzit.co',
    password: 'password123',
    description: 'Administrative access',
    icon: User,
    color: 'bg-blue-100 text-blue-800'
  },
  {
    role: 'Property Manager',
    email: 'manager@fixzit.co',
    password: 'password123',
    description: 'Property management',
    icon: Building2,
    color: 'bg-green-100 text-green-800'
  },
  {
    role: 'Tenant',
    email: 'tenant@fixzit.co',
    password: 'password123',
    description: 'Tenant portal access',
    icon: Users,
    color: 'bg-purple-100 text-purple-800'
  },
  {
    role: 'Vendor',
    email: 'vendor@fixzit.co',
    password: 'password123',
    description: 'Vendor marketplace access',
    icon: Users,
    color: 'bg-orange-100 text-orange-800'
  }
];

const CORPORATE_CREDENTIALS = [
  {
    role: 'Property Manager (Corporate)',
    employeeNumber: 'EMP001',
    password: 'password123',
    description: 'Corporate account access',
    icon: Building2,
    color: 'bg-green-100 text-green-800'
  },
  {
    role: 'Admin (Corporate)',
    employeeNumber: 'EMP002',
    password: 'password123',
    description: 'Corporate administrative access',
    icon: User,
    color: 'bg-blue-100 text-blue-800'
  }
];

export default function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<'personal' | 'corporate' | 'sso'>('personal');
  const [email, setEmail] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
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

  const redirectTarget = searchParams.get('next') || searchParams.get('callbackUrl') || null;
  const showDemoCredentials = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true' || process.env.NODE_ENV === 'development';

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);
  const empRegex = useMemo(() => /^EMP\d+$/i, []);

  // Quick login helper
  const quickLogin = (credential: typeof DEMO_CREDENTIALS[0] | typeof CORPORATE_CREDENTIALS[0]) => {
    if ('email' in credential) {
      setEmail(credential.email);
      setLoginMethod('personal');
    } else {
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

  const validateEmail = (value: string): string | null => {
    const v = value.trim();
    if (!v) return t('login.errors.emailRequired', 'Email is required');
    if (!emailRegex.test(v)) return t('login.errors.emailInvalid', 'Enter a valid email address');
    return null;
  };

  const validateEmployeeNumber = (value: string): string | null => {
    const v = value.trim();
    if (!v) return t('login.errors.employeeRequired', 'Employee number is required');
    if (!empRegex.test(v)) return t('login.errors.employeeInvalid', 'Enter a valid employee number (e.g., EMP001)');
    return null;
  };

  const validatePassword = (value: string): string | null => {
    if (!value) return t('login.errors.passwordRequired', 'Password is required');
    if (value.length < 8) return t('login.errors.passwordTooShort', 'Password must be at least 8 characters');
    return null;
  };

  const validateForm = (): boolean => {
    const next: FormErrors = {};
    
    if (loginMethod === 'personal') {
      const emailErr = validateEmail(email);
      if (emailErr) next.identifier = emailErr;
    } else if (loginMethod === 'corporate') {
      const empErr = validateEmployeeNumber(employeeNumber);
      if (empErr) next.identifier = empErr;
    }
    
    const pwErr = validatePassword(password);
    if (pwErr) next.password = pwErr;
    
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const postLoginRouteFor = (role?: string): string => {
    if (redirectTarget && redirectTarget.startsWith('/') && !redirectTarget.startsWith('//')) {
      return redirectTarget;
    }

    const r = (role || '').toUpperCase();
    if (r === 'SUPER_ADMIN' || r === 'CORPORATE_ADMIN' || r === 'FM_MANAGER') return '/fm/dashboard';
    if (r === 'TENANT') return '/fm/properties';
    if (r === 'VENDOR') return '/fm/marketplace';
    return '/fm/dashboard';
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loginMethod === 'sso') return;

    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      // Use NextAuth signIn with credentials provider
      const identifier = loginMethod === 'personal' ? email.trim() : employeeNumber.trim();
      
      const result = await signIn('credentials', {
        identifier,
        password,
        rememberMe,
        redirect: false, // Handle redirect manually
      });

      if (result?.error) {
        // Handle login errors from NextAuth
        if (result.error === 'CredentialsSignin') {
          setErrors({
            general: t('login.errors.invalidCredentials', 'Invalid email/employee number or password')
          });
        } else {
          setErrors({
            general: t('login.errors.loginFailed', 'Login failed. Please try again.')
          });
        }
        setLoading(false);
        return;
      }

      if (result?.ok) {
        setSuccess(true);

        // Determine redirect target (default to /fm/dashboard)
        const redirectTo = redirectTarget || '/fm/dashboard';

        // Small delay to ensure session is established
        setTimeout(() => {
          router.push(redirectTo);
          // Force a page refresh to ensure middleware recognizes the new session
          window.location.href = redirectTo;
        }, 500);
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrors({ general: t('login.errors.networkError', 'Network error. Please check your connection.') });
      setLoading(false);
    }
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
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
        <div className="bg-card rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
              <span className="text-primary-foreground text-2xl font-bold">F</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t('login.welcome', 'Welcome Back')}
            </h1>
            <p className="text-muted-foreground">
              {t('login.subtitle', 'Sign in to your Fixzit account')}
            </p>
          </div>

          {/* Login Method Tabs */}
          <div className={`flex bg-muted rounded-2xl p-1 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
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

          {/* Form - Personal & Corporate */}
          {(loginMethod === 'personal' || loginMethod === 'corporate') && (
            <form onSubmit={onSubmit} className="space-y-5" noValidate data-testid="login-form">
              {/* Email or Employee Number */}
              <div>
                <label htmlFor={loginMethod === 'personal' ? 'email' : 'employeeNumber'} className="block text-sm font-medium text-foreground mb-2">
                  {loginMethod === 'personal' 
                    ? t('login.personalEmail', 'Personal Email Address')
                    : t('login.employeeNumber', 'Employee Number')}
                </label>
                <div className="relative">
                  {loginMethod === 'personal' ? (
                    <Mail className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                  ) : (
                    <User className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                  )}
                  <Input
                    id={loginMethod === 'personal' ? 'email' : 'employeeNumber'}
                    data-testid="login-email"
                    type="text"
                    inputMode={loginMethod === 'personal' ? 'email' : 'text'}
                    enterKeyHint="next"
                    autoComplete={loginMethod === 'personal' ? 'email' : 'username'}
                    placeholder={loginMethod === 'personal' 
                      ? t('login.enterEmail', 'Enter your personal email')
                      : t('login.enterEmployeeNumber', 'Enter your employee number')}
                    value={loginMethod === 'personal' ? email : employeeNumber}
                    onChange={(e) => {
                      if (loginMethod === 'personal') {
                        setEmail(e.target.value);
                      } else {
                        setEmployeeNumber(e.target.value);
                      }
                      clearError('identifier');
                      clearError('general');
                    }}
                    className={`${isRTL ? 'pr-10 text-right' : 'pl-10'} h-12 ${errors.identifier ? 'border-red-500 focus:ring-red-500' : ''}`}
                    aria-invalid={!!errors.identifier}
                    disabled={loading}
                    autoFocus
                    required
                  />
                </div>
                {loginMethod === 'corporate' && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t('login.corporateHelp', 'Use your employee number and password. No separate corporate ID needed.')}
                  </p>
                )}
                {errors.identifier && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.identifier}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    {t('common.password', 'Password')}
                  </label>
                  <Link href="/forgot-password" className="text-sm text-primary hover:text-primary transition-colors">
                    {t('common.forgotPassword', 'Forgot?')}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                  <Input
                    id="password"
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
                    className={`${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} h-12 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                    style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                    aria-invalid={!!errors.password}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground`}
                    aria-label={showPassword ? t('login.hidePassword', 'Hide password') : t('login.showPassword', 'Show password')}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {capsLockOn && (
                  <p className="mt-1 text-sm text-yellow-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {t('login.capsLockOn', 'Caps Lock is on')}
                  </p>
                )}
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
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
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                  disabled={loading}
                />
                <label htmlFor="rememberMe" className="text-sm text-foreground cursor-pointer select-none">
                  {t('login.rememberMe', 'Remember me for 30 days')}
                </label>
              </div>

              {/* General Error */}
              {errors.general && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className={`flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{errors.general}</span>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                data-testid="login-submit"
                disabled={loading || !password || (loginMethod === 'personal' ? !email : !employeeNumber)}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                <GoogleSignInButton />
                <button 
                  type="button"
                  className={`flex items-center justify-center gap-3 w-full p-3 border border-border rounded-2xl hover:bg-muted transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Apple className="h-5 w-5 text-foreground" />
                  <span>{t('login.continueWith', 'Continue with')} Apple</span>
                </button>
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

          {/* Demo Credentials */}
          {showDemoCredentials && loginMethod !== 'sso' && (
            <div className="mt-6 space-y-4">
              {/* Personal Email Credentials */}
              {loginMethod === 'personal' && (
                <div className={`p-4 bg-muted rounded-2xl ${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    {t('login.personalEmailAccounts', 'Personal Email Accounts:')}
                  </h3>
                  <div className="space-y-2">
                    {DEMO_CREDENTIALS.map((cred) => {
                      const Icon = cred.icon;
                      return (
                        <button
                          key={cred.role}
                          type="button"
                          onClick={() => quickLogin(cred)}
                          className={`w-full p-3 rounded-2xl border transition-colors hover:shadow-md ${cred.color}`}
                        >
                          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Icon size={18} />
                            <div className="flex-1 text-left">
                              <div className="font-medium text-sm">{cred.role}</div>
                              <div className="text-xs opacity-80">{cred.description}</div>
                            </div>
                            <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
                          </div>
                          <div className="text-xs mt-1 opacity-75">
                            {cred.email} / {cred.password}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Corporate Account Credentials */}
              {loginMethod === 'corporate' && (
                <div className={`p-4 bg-blue-50 rounded-2xl border border-blue-200 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className="text-sm font-medium text-blue-800 mb-3">
                    {t('login.corporateAccountEmployee', 'Corporate Account (Employee Number):')}
                  </h3>
                  <div className="space-y-2">
                    {CORPORATE_CREDENTIALS.map((cred) => {
                      const Icon = cred.icon;
                      return (
                        <button
                          key={cred.role}
                          type="button"
                          onClick={() => quickLogin(cred)}
                          className={`w-full p-3 rounded-2xl border transition-colors hover:shadow-md ${cred.color}`}
                        >
                          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Icon size={18} />
                            <div className="flex-1 text-left">
                              <div className="font-medium text-sm">{cred.role}</div>
                              <div className="text-xs opacity-80">{cred.description}</div>
                            </div>
                            <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
                          </div>
                          <div className="text-xs mt-1 opacity-75">
                            {t('login.employeeHash', 'Employee #:')} {cred.employeeNumber} / {cred.password}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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
    </div>
  );
}
