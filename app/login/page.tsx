'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Eye, EyeOff, LogIn, Mail, Lock, AlertCircle, Globe,
  ChevronDown, User, Shield, Building2, Users,
  ArrowRight, Chrome, Apple
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { memo } from 'react';
import { cn } from '@/lib/utils';
// Memoized components for better performance
const LanguageSelector = memo(({ 
  selectedLang, 
  showDropdown, 
  onToggle, 
  onChange 
}: {
  selectedLang: Lang;
  showDropdown: boolean;
  onToggle: () => void;
  onChange: (lang: Lang) => void;
}) => (
  <div className="relative">
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-all duration-200 backdrop-blur-sm"
      aria-label="Language selector"
      aria-expanded={showDropdown}
    >
      <span className="text-lg">{selectedLang.flag}</span>
      <span className="text-sm font-medium">{selectedLang.code.toUpperCase()}</span>
      <ChevronDown size={14} className={cn(
        "transition-transform duration-200",
        showDropdown && "rotate-180"
      )} />
    </button>

    <AnimatePresence>
      {showDropdown && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 overflow-hidden"
        >
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => onChange(lang)}
              className={cn(
                "w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 text-gray-900 transition-colors",
                lang.code === selectedLang.code && "bg-[#0061A8]/10"
              )}
            >
              <span className="text-xl">{lang.flag}</span>
              <div className="flex-1 text-left">
                <div className="font-medium">{lang.native}</div>
                <div className="text-xs text-gray-500">{lang.code.toUpperCase()}</div>
              </div>
              {lang.code === selectedLang.code && (
                <motion.div 
                  layoutId="selected-lang"
                  className="w-2 h-2 rounded-full bg-[#0061A8]" 
                />
              )}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
));

LanguageSelector.displayName = 'LanguageSelector';

type Lang = { code: string; native: string; flag: string; dir: 'ltr' | 'rtl' };
const LANGUAGES: Lang[] = [
  { code: 'ar', native: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'en', native: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'fr', native: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'es', native: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'de', native: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
];

const CURRENCIES = [
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' }
];

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
  const [email, setEmail] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Lang>(LANGUAGES[1]); // Default EN
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]); // Default SAR
  const [loginMethod, setLoginMethod] = useState<'personal' | 'corporate' | 'sso'>('personal');
  const router = useRouter();

  // Load saved preferences
  useEffect(() => {
    const savedLang = localStorage.getItem('fxz.lang');
    const savedCurrency = localStorage.getItem('fixzit-currency');

    if (savedLang) {
      const found = LANGUAGES.find(l => l.code === savedLang);
      if (found) setSelectedLang(found);
    }
    if (savedCurrency) {
      const found = CURRENCIES.find(c => c.code === savedCurrency);
      if (found) setSelectedCurrency(found);
    }
  }, []);

  // Handle language change
  const handleLanguageChange = (lang: Lang) => {
    setSelectedLang(lang);
    localStorage.setItem('fxz.lang', lang.code);
    document.documentElement.dir = lang.dir;
    document.documentElement.lang = lang.code;
    setShowLangDropdown(false);
  };

  // Handle currency change
  const handleCurrencyChange = (currency: typeof CURRENCIES[0]) => {
    setSelectedCurrency(currency);
    localStorage.setItem('fixzit-currency', currency.code);
    setShowCurrencyDropdown(false);
  };

  // Quick login with demo credentials
  const quickLogin = (credential: typeof DEMO_CREDENTIALS[0] | typeof CORPORATE_CREDENTIALS[0]) => {
    if ('email' in credential) {
      // Personal email credential
      setEmail(credential.email);
    } else {
      // Corporate credential
      setEmployeeNumber(credential.employeeNumber);
    }
    setPassword(credential.password);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let loginData: Record<string, unknown> = {};

      if (loginMethod === 'personal') {
        loginData = { email, password, loginType: 'personal' };
      } else if (loginMethod === 'corporate') {
        loginData = { employeeNumber, password, loginType: 'corporate' };
      } else {
        throw new Error('Invalid login method');
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify(loginData)});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
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
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0061A8] via-[#00A859] to-[#FFB400] flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-white">
        <div className="max-w-md text-center">
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg">
                <div className="w-20 h-20 bg-[#0061A8] rounded-xl flex items-center justify-center text-white font-bold text-2xl">
                  F
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">Fixzit Enterprise</h1>
            <p className="text-xl text-white/90 mb-8">
              Facility Management + Marketplace Platform
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="font-semibold">Property Management</h3>
                <p className="text-white/80 text-sm">Manage real estate portfolios</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Users size={24} />
              </div>
              <div>
                <h3 className="font-semibold">Work Orders</h3>
                <p className="text-white/80 text-sm">Streamline maintenance requests</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Globe size={24} />
              </div>
              <div>
                <h3 className="font-semibold">Marketplace</h3>
                <p className="text-white/80 text-sm">Connect with verified vendors</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Top Bar with Language and Currency */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLangDropdown(!showLangDropdown)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors"
                >
                  <span className="text-lg">{selectedLang.flag}</span>
                  <span className="text-sm font-medium">{selectedLang.code.toUpperCase()}</span>
                  <ChevronDown size={14} />
                </button>

                {showLangDropdown && (
                  <div className="absolute top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang)}
                        className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 text-gray-900 ${
                          lang.code === selectedLang.code ? 'bg-[#0061A8]/10' : ''
                        }`}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{lang.native}</div>
                          <div className="text-xs text-gray-500">{lang.code.toUpperCase()}</div>
                        </div>
                        {lang.code === selectedLang.code && (
                          <div className="w-2 h-2 rounded-full bg-[#0061A8]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Currency Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors"
                >
                  <span className="font-medium">{selectedCurrency.symbol}</span>
                  <span className="text-sm">{selectedCurrency.code}</span>
                  <ChevronDown size={14} />
                </button>

                {showCurrencyDropdown && (
                  <div className="absolute top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    {CURRENCIES.map(currency => (
                      <button
                        key={currency.code}
                        onClick={() => handleCurrencyChange(currency)}
                        className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 text-gray-900 text-sm ${
                          currency.code === selectedCurrency.code ? 'bg-[#0061A8]/10' : ''
                        }`}
                      >
                        <span className="font-medium">{currency.symbol}</span>
                        <span>{currency.code}</span>
                        <span className="text-gray-500 text-xs ml-auto">{currency.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Link href="/" className="text-white/80 hover:text-white text-sm">
              ← Back to Home
            </Link>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to your Fixzit account</p>
            </div>

            {/* Login Method Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
              <button
                onClick={() => setLoginMethod('personal')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'personal'
                    ? 'bg-[#0061A8] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Personal Email
              </button>
              <button
                onClick={() => setLoginMethod('corporate')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'corporate'
                    ? 'bg-[#0061A8] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Corporate Account
              </button>
              <button
                onClick={() => setLoginMethod('sso')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'sso'
                    ? 'bg-[#0061A8] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                SSO Login
              </button>
            </div>

            {loginMethod === 'personal' || loginMethod === 'corporate' ? (
              <form onSubmit={onSubmit} className="space-y-6">
                {/* Personal Email Login */}
                {loginMethod === 'personal' && (
                  <>
                    {/* Email Field */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Personal Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your personal email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-12"
                          required
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10 h-12"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Corporate Account Login */}
                {loginMethod === 'corporate' && (
                  <>
                    {/* Employee Number Field */}
                    <div>
                      <label htmlFor="employeeNumber" className="block text-sm font-medium text-gray-700 mb-2">
                        Employee Number
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="employeeNumber"
                          type="text"
                          placeholder="Enter your employee number"
                          value={employeeNumber}
                          onChange={(e) => setEmployeeNumber(e.target.value)}
                          className="pl-10 h-12"
                          required
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10 h-12"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Forgot Password */}
                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-sm text-[#0061A8] hover:underline">
                    Forgot Password?
                  </Link>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading || (!email && loginMethod === 'personal') || (!employeeNumber && loginMethod === 'corporate') || !password}
                  className="w-full h-12 bg-[#0061A8] hover:bg-[#0061A8]/90 text-white font-semibold"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <LogIn className="h-5 w-5" />
                      Sign In
                    </div>
                  )}
                </Button>
              </form>
            ) : (
              /* SSO Login Options */
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <button className="flex items-center justify-center gap-3 w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Chrome className="h-5 w-5 text-blue-600" />
                    <span>Continue with Google</span>
                  </button>
                  <button className="flex items-center justify-center gap-3 w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Apple className="h-5 w-5 text-gray-900" />
                    <span>Continue with Apple</span>
                  </button>
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or use account</span>
                  </div>
                </div>

                <button
                  onClick={() => setLoginMethod('personal')}
                  className="w-full py-2 text-[#0061A8] hover:text-[#0061A8]/80 font-medium"
                >
                  Use Personal Email
                </button>
                <button
                  onClick={() => setLoginMethod('corporate')}
                  className="w-full py-2 text-[#0061A8] hover:text-[#0061A8]/80 font-medium"
                >
                  Use Corporate Account
                </button>
              </div>
            )}

            {/* Demo Credentials */}
            <div className="mt-6 space-y-4">
              {/* Personal Email Credentials */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Personal Email Accounts:</h3>
                <div className="space-y-2">
                  {DEMO_CREDENTIALS.map((cred) => {
                    const Icon = cred.icon;
                    return (
                      <button
                        key={cred.role}
                        onClick={() => quickLogin(cred)}
                        className={`w-full p-3 rounded-lg border transition-colors hover:shadow-md ${cred.color}`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={18} />
                          <div className="flex-1 text-left">
                            <div className="font-medium text-sm">{cred.role}</div>
                            <div className="text-xs opacity-80">{cred.description}</div>
                          </div>
                          <ArrowRight size={16} />
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
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-800 mb-3">Corporate Account (Employee Number):</h3>
                <div className="space-y-2">
                  {CORPORATE_CREDENTIALS.map((cred) => {
                    const Icon = cred.icon;
                    return (
                      <button
                        key={cred.role}
                        onClick={() => quickLogin(cred)}
                        className={`w-full p-3 rounded-lg border transition-colors hover:shadow-md ${cred.color}`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={18} />
                          <div className="flex-1 text-left">
                            <div className="font-medium text-sm">{cred.role}</div>
                            <div className="text-xs opacity-80">{cred.description}</div>
                          </div>
                          <ArrowRight size={16} />
                        </div>
                        <div className="text-xs mt-1 opacity-75">
                          Employee #: {cred.employeeNumber} / {cred.password}
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
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-[#0061A8] hover:underline font-medium">
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
