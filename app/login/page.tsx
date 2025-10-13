'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Eye, EyeOff, LogIn, Mail, Lock, AlertCircle,
  User, Shield, Building2, Users,
  ArrowRight, Chrome, Apple
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import LanguageSelector from '@/components/i18n/LanguageSelector';
import CurrencySelector from '@/components/i18n/CurrencySelector';

type LoginMethod = 'personal' | 'corporate' | 'sso';

type PersonalCredential = {
  roleKey: string;
  roleFallback: string;
  descriptionKey: string;
  descriptionFallback: string;
  icon: LucideIcon;
  color: string;
  email: string;
  password: string;
};

type CorporateCredential = {
  roleKey: string;
  roleFallback: string;
  descriptionKey: string;
  descriptionFallback: string;
  icon: LucideIcon;
  color: string;
  employeeNumber: string;
  password: string;
};

type PersonalFormState = {
  email: string;
  password: string;
};

type CorporateFormState = {
  employeeNumber: string;
  password: string;
};

type FormState = {
  personal: PersonalFormState;
  corporate: CorporateFormState;
};

type FormStateOverrides = {
  personal?: Partial<PersonalFormState>;
  corporate?: Partial<CorporateFormState>;
};

const createInitialFormState = (): FormState => ({
  personal: { email: '', password: '' },
  corporate: { employeeNumber: '', password: '' }
});

const DEMO_CREDENTIALS: PersonalCredential[] = [
  {
    roleKey: 'login.demo.superAdmin.role',
    roleFallback: 'Super Admin',
    email: 'superadmin@fixzit.co',
    password: 'password123',
    descriptionKey: 'login.demo.superAdmin.description',
    descriptionFallback: 'Full system access',
    icon: Shield,
    color: 'bg-red-100 text-red-800'
  },
  {
    roleKey: 'login.demo.admin.role',
    roleFallback: 'Admin',
    email: 'admin@fixzit.co',
    password: 'password123',
    descriptionKey: 'login.demo.admin.description',
    descriptionFallback: 'Administrative access',
    icon: User,
    color: 'bg-blue-100 text-blue-800'
  },
  {
    roleKey: 'login.demo.propertyManager.role',
    roleFallback: 'Property Manager',
    email: 'manager@fixzit.co',
    password: 'password123',
    descriptionKey: 'login.demo.propertyManager.description',
    descriptionFallback: 'Property management',
    icon: Building2,
    color: 'bg-green-100 text-green-800'
  },
  {
    roleKey: 'login.demo.tenant.role',
    roleFallback: 'Tenant',
    email: 'tenant@fixzit.co',
    password: 'password123',
    descriptionKey: 'login.demo.tenant.description',
    descriptionFallback: 'Tenant portal access',
    icon: Users,
    color: 'bg-purple-100 text-purple-800'
  },
  {
    roleKey: 'login.demo.vendor.role',
    roleFallback: 'Vendor',
    email: 'vendor@fixzit.co',
    password: 'password123',
    descriptionKey: 'login.demo.vendor.description',
    descriptionFallback: 'Vendor marketplace access',
    icon: Users,
    color: 'bg-orange-100 text-orange-800'
  }
];

const CORPORATE_CREDENTIALS: CorporateCredential[] = [
  {
    roleKey: 'login.demo.corporateManager.role',
    roleFallback: 'Property Manager (Corporate)',
    employeeNumber: 'EMP001',
    password: 'password123',
    descriptionKey: 'login.demo.corporateManager.description',
    descriptionFallback: 'Corporate account access',
    icon: Building2,
    color: 'bg-green-100 text-green-800'
  },
  {
    roleKey: 'login.demo.corporateAdmin.role',
    roleFallback: 'Admin (Corporate)',
    employeeNumber: 'EMP002',
    password: 'password123',
    descriptionKey: 'login.demo.corporateAdmin.description',
    descriptionFallback: 'Corporate administrative access',
    icon: User,
    color: 'bg-blue-100 text-blue-800'
  }
];

export default function LoginPage() {
  const [formState, setFormState] = useState<FormState>(() => createInitialFormState());
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('personal');
  const router = useRouter();
  const { t, isRTL } = useTranslation();

  const personalForm = formState.personal;
  const corporateForm = formState.corporate;
  const isPersonalLogin = loginMethod === 'personal';
  const isCorporateLogin = loginMethod === 'corporate';

  const updateLoginMethod = (
    method: LoginMethod,
    overrides?: FormStateOverrides,
    options?: { force?: boolean; resetOpposing?: boolean }
  ) => {
    if (loading && !options?.force) {
      return;
    }

    setLoginMethod(method);
    setError('');
    setShowPassword(false);

    if (overrides || options?.resetOpposing) {
      setFormState((prev) => {
        const initial = createInitialFormState();
        const next: FormState = {
          personal:
            options?.resetOpposing && method !== 'personal'
              ? initial.personal
              : { ...prev.personal },
          corporate:
            options?.resetOpposing && method !== 'corporate'
              ? initial.corporate
              : { ...prev.corporate }
        };

        if (overrides?.personal) {
          next.personal = { ...next.personal, ...overrides.personal };
        }

        if (overrides?.corporate) {
          next.corporate = { ...next.corporate, ...overrides.corporate };
        }

        return next;
      });
    }
  };

  // Quick login with demo credentials
  const quickLogin = (credential: PersonalCredential | CorporateCredential) => {
    if (loading) {
      return;
    }

    if ('email' in credential) {
      updateLoginMethod(
        'personal',
        {
          personal: {
            email: credential.email,
            password: credential.password
          }
        },
        { force: true, resetOpposing: true }
      );
    } else {
      updateLoginMethod(
        'corporate',
        {
          corporate: {
            employeeNumber: credential.employeeNumber,
            password: credential.password
          }
        },
        { force: true, resetOpposing: true }
      );
    }
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let loginData: Record<string, unknown> = {};

      if (loginMethod === 'personal') {
        loginData = {
          email: personalForm.email.trim(),
          password: personalForm.password,
          loginType: 'personal'
        };
      } else if (loginMethod === 'corporate') {
        loginData = {
          employeeNumber: corporateForm.employeeNumber.trim(),
          password: corporateForm.password,
          loginType: 'corporate'
        };
      } else {
        throw new Error(t('login.invalidMethod', 'Invalid login method'));
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('login.loginFailed', 'Login failed'));
      }

      if (data.ok) {
        // Set role in localStorage for immediate access
        if (data.user && data.user.role) {
          localStorage.setItem('fixzit-role', data.user.role);
        }

        // Redirect to dashboard on successful login
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.loginFailed', 'Login failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0061A8] via-[#00A859] to-[#FFB400] flex" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Left Panel - Branding */}
      <div className={`hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-white ${isRTL ? 'text-right' : 'text-left'}`}>
        <div className="max-w-md text-center">
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg">
                <div className="w-20 h-20 bg-[#0061A8] rounded-xl flex items-center justify-center text-white font-bold text-2xl">
                  F
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">{t('common.brand', 'Fixzit Enterprise')}</h1>
            <p className="text-xl text-white/90 mb-8">
              {t('landing.subtitle', 'Unified Facility Management + Marketplace Solution for modern property operations')}
            </p>
          </div>

          <div className="space-y-6">
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-3 bg-white/20 rounded-lg">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="font-semibold">{t('nav.properties', 'Property Management')}</h3>
                <p className="text-white/80 text-sm">{t('login.propertyDesc', 'Manage real estate portfolios')}</p>
              </div>
            </div>
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-3 bg-white/20 rounded-lg">
                <Users size={24} />
              </div>
              <div>
                <h3 className="font-semibold">{t('nav.work-orders', 'Work Orders')}</h3>
                <p className="text-white/80 text-sm">{t('login.workOrdersDesc', 'Streamline maintenance requests')}</p>
              </div>
            </div>
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-3 bg-white/20 rounded-lg">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="font-semibold">{t('nav.marketplace', 'Marketplace')}</h3>
                <p className="text-white/80 text-sm">{t('login.marketplaceDesc', 'Connect with verified vendors')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
        <div className={`w-full max-w-md ${isRTL ? 'text-right' : 'text-left'}`}>
          {/* Top Bar with Language and Currency */}
          <div className={`flex items-center justify-between mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <LanguageSelector variant="default" />
              <CurrencySelector variant="default" />
            </div>

            <Link href="/" className="text-white/80 hover:text-white text-sm">
              {isRTL
                ? `${t('login.backToHome', 'Back to Home')} ←`
                : `← ${t('login.backToHome', 'Back to Home')}`}
            </Link>
          </div>

          {/* Login Form */}
          <div className={`bg-white rounded-2xl shadow-2xl p-8 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('login.welcomeBack', 'Welcome Back')}</h2>
              <p className="text-gray-600">{t('login.signInAccount', 'Sign in to your Fixzit account')}</p>
            </div>

            {/* Login Method Toggle */}
            <div className={`flex bg-gray-100 rounded-lg p-1 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                onClick={() => updateLoginMethod('personal')}
                aria-pressed={loginMethod === 'personal'}
                disabled={loading}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  loginMethod === 'personal'
                    ? 'bg-[#0061A8] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('login.personalEmailTab', 'Personal Email')}
              </button>
              <button
                type="button"
                onClick={() => updateLoginMethod('corporate')}
                aria-pressed={loginMethod === 'corporate'}
                disabled={loading}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  loginMethod === 'corporate'
                    ? 'bg-[#0061A8] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('login.corporateAccountTab', 'Corporate Account')}
              </button>
              <button
                type="button"
                onClick={() => updateLoginMethod('sso')}
                aria-pressed={loginMethod === 'sso'}
                disabled={loading}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  loginMethod === 'sso'
                    ? 'bg-[#0061A8] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('login.ssoLoginTab', 'SSO Login')}
              </button>
            </div>

            {isPersonalLogin || isCorporateLogin ? (
              <form onSubmit={onSubmit} className="space-y-6">
                {/* Personal Email Login */}
                {isPersonalLogin && (
                  <>
                    {/* Email Field */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        {t('login.personalEmail', 'Personal Email Address')}
                      </label>
                      <div className="relative">
                        <Mail className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400`} />
                        <Input
                          id="email"
                          type="email"
                          placeholder={t('login.enterEmail', 'Enter your personal email')}
                          value={personalForm.email}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              personal: { ...prev.personal, email: e.target.value }
                            }))
                          }
                          className={`${isRTL ? 'pr-10 text-right' : 'pl-10'} h-12`}
                          required
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        {t('common.password', 'Password')}
                      </label>
                      <div className="relative">
                        <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400`} />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t('login.enterPassword', 'Enter your password')}
                          value={personalForm.password}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              personal: { ...prev.personal, password: e.target.value }
                            }))
                          }
                          className={`${isRTL ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10'} h-12`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600`}
                          aria-label={showPassword ? t('login.hidePassword', 'Hide password') : t('login.showPassword', 'Show password')}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Corporate Account Login */}
                {isCorporateLogin && (
                  <>
                    {/* Employee Number Field */}
                    <div>
                      <label htmlFor="employeeNumber" className="block text-sm font-medium text-gray-700 mb-2">
                        {t('login.employeeNumber', 'Employee Number')}
                      </label>
                      <div className="relative">
                        <User className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400`} />
                        <Input
                          id="employeeNumber"
                          type="text"
                          placeholder={t('login.enterEmployeeNumber', 'Enter your employee number')}
                          value={corporateForm.employeeNumber}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              corporate: { ...prev.corporate, employeeNumber: e.target.value }
                            }))
                          }
                          className={`${isRTL ? 'pr-10 text-right' : 'pl-10'} h-12`}
                          required
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {t('login.corporateHelp', 'Use your employee number and password. No separate corporate ID needed.')}
                      </p>
                    </div>

                    {/* Password Field */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        {t('common.password', 'Password')}
                      </label>
                      <div className="relative">
                        <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400`} />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t('login.enterPassword', 'Enter your password')}
                          value={corporateForm.password}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              corporate: { ...prev.corporate, password: e.target.value }
                            }))
                          }
                          className={`${isRTL ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10'} h-12`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600`}
                          aria-label={showPassword ? t('login.hidePassword', 'Hide password') : t('login.showPassword', 'Show password')}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Forgot Password */}
                <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                  <Link href="/forgot-password" className="text-sm text-[#0061A8] hover:underline">
                    {t('common.forgotPassword', 'Forgot Password?')}
                  </Link>
                </div>

                {/* Error Message */}
                {error && (
                  <div className={`flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    (isPersonalLogin
                      ? !personalForm.email.trim() || !personalForm.password
                      : isCorporateLogin
                        ? !corporateForm.employeeNumber.trim() || !corporateForm.password
                        : true)
                  }
                  className="w-full h-12 bg-[#0061A8] hover:bg-[#0061A8]/90 text-white font-semibold"
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
            ) : (
              /* SSO Login Options */
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    className={`flex items-center justify-center gap-3 w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Chrome className="h-5 w-5 text-blue-600" />
                    <span>{t('login.googleLogin', 'Login with Google')}</span>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    className={`flex items-center justify-center gap-3 w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Apple className="h-5 w-5 text-gray-900" />
                    <span>{t('login.appleLogin', 'Login with Apple')}</span>
                  </button>
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">{t('login.orUseAccount', 'Or use account')}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => updateLoginMethod('personal')}
                  disabled={loading}
                  className="w-full py-2 text-[#0061A8] hover:text-[#0061A8]/80 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {t('login.usePersonalEmail', 'Use Personal Email')}
                </button>
                <button
                  type="button"
                  onClick={() => updateLoginMethod('corporate')}
                  disabled={loading}
                  className="w-full py-2 text-[#0061A8] hover:text-[#0061A8]/80 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {t('login.useCorporateAccount', 'Use Corporate Account')}
                </button>
              </div>
            )}

            {/* Demo Credentials */}
            <div className="mt-6 space-y-4">
              {/* Personal Email Credentials */}
              <div className={`p-4 bg-gray-50 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                <h3 className="text-sm font-medium text-gray-700 mb-3">{t('login.personalEmailAccounts', 'Personal Email Accounts:')}</h3>
                <div className="space-y-2">
                  {DEMO_CREDENTIALS.map((cred) => {
                    const Icon = cred.icon;
                    return (
                      <button
                        type="button"
                        key={cred.roleKey}
                        onClick={() => quickLogin(cred)}
                        disabled={loading}
                        className={`w-full p-3 rounded-lg border transition-colors hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed ${cred.color}`}
                      >
                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Icon size={18} />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{t(cred.roleKey, cred.roleFallback)}</div>
                            <div className="text-xs opacity-80">{t(cred.descriptionKey, cred.descriptionFallback)}</div>
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

              {/* Corporate Account Credentials */}
              <div className={`p-4 bg-blue-50 rounded-lg border border-blue-200 ${isRTL ? 'text-right' : 'text-left'}`}>
                <h3 className="text-sm font-medium text-blue-800 mb-3">{t('login.corporateAccountEmployee', 'Corporate Account (Employee Number):')}</h3>
                <div className="space-y-2">
                  {CORPORATE_CREDENTIALS.map((cred) => {
                    const Icon = cred.icon;
                    return (
                      <button
                        type="button"
                        key={cred.roleKey}
                        onClick={() => quickLogin(cred)}
                        disabled={loading}
                        className={`w-full p-3 rounded-lg border transition-colors hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed ${cred.color}`}
                      >
                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Icon size={18} />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{t(cred.roleKey, cred.roleFallback)}</div>
                            <div className="text-xs opacity-80">{t(cred.descriptionKey, cred.descriptionFallback)}</div>
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
            </div>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                {t('login.noAccount', "Don't have an account?")}{' '}
                <Link href="/signup" className="text-[#0061A8] hover:underline font-medium">
                  {t('login.createAccount', 'Sign up here')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
