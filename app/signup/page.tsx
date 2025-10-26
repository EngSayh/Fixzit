'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Eye, EyeOff, UserPlus, Mail, Lock, Building2, Phone,
  Globe, ChevronDown, ArrowLeft, CheckCircle, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';

type Lang = { code: string; native: string; flag: string; dir: 'ltr' | 'rtl' };
const LANGUAGES: Lang[] = [
  { code: 'ar', native: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'en', native: 'English', flag: '🇬🇧', dir: 'ltr' },
];

const CURRENCIES = [
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

export default function SignupPage() {
  const { t } = useTranslation();
  
  const USER_TYPES = [
    { value: 'personal', label: t('signup.accountType.personal', 'Personal Account'), description: t('signup.accountType.personalDesc', 'For individual users') },
    { value: 'corporate', label: t('signup.accountType.corporate', 'Corporate Account'), description: t('signup.accountType.corporateDesc', 'For businesses and organizations') },
    { value: 'vendor', label: t('signup.accountType.vendor', 'Vendor Account'), description: t('signup.accountType.vendorDesc', 'For service providers and suppliers') },
  ];

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    userType: 'personal',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
    newsletter: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Lang>(LANGUAGES[1]); // Default EN
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]); // Default SAR

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

  // Handle input changes
  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear errors when user starts typing
    if (error) setError('');
  };

  // Form validation
  const validateForm = () => {
    if (!formData.firstName.trim()) return t('signup.validation.firstNameRequired', 'First name is required');
    if (!formData.lastName.trim()) return t('signup.validation.lastNameRequired', 'Last name is required');
    if (!formData.email.trim()) return t('signup.validation.emailRequired', 'Email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return t('signup.validation.emailInvalid', 'Please enter a valid email');
    if (!formData.phone.trim()) return t('signup.validation.phoneRequired', 'Phone number is required');
    if (formData.userType === 'corporate' && !formData.companyName.trim()) return t('signup.validation.companyRequired', 'Company name is required for corporate accounts');
    if (formData.password.length < 8) return t('signup.validation.passwordLength', 'Password must be at least 8 characters');
    if (formData.password !== formData.confirmPassword) return t('signup.validation.passwordMatch', 'Passwords do not match');
    if (!formData.termsAccepted) return t('signup.validation.termsRequired', 'Please accept the terms and conditions');
    return null;
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const signupData = {
        ...formData,
        fullName: `${formData.firstName} ${formData.lastName}`,
        preferredLanguage: selectedLang.code,
        preferredCurrency: selectedCurrency.code,
      };

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      if (data.ok) {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-500 via-success to-accent flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-[var(--fixzit-success-lighter)] rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-[var(--fixzit-success)]" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('signup.success.title', 'Account Created Successfully!')}</h2>
            <p className="text-gray-600 mb-6">
              {t('signup.success.message', 'Welcome to Fixzit Enterprise! Your account has been created and you can now sign in.')}
            </p>
            <p className="text-sm text-gray-500">
              {t('signup.success.redirecting', 'Redirecting you to the login page...')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 via-success to-accent flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-white">
        <div className="max-w-md text-center">
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg">
                <div className="w-20 h-20 bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
                  F
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">{t('signup.branding.title', 'Join Fixzit Enterprise')}</h1>
            <p className="text-xl text-white/90 mb-8">
              {t('signup.branding.subtitle', 'Create your account and start managing your facilities and marketplace operations')}
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="font-semibold">{t('signup.features.facility.title', 'Facility Management')}</h3>
                <p className="text-white/80 text-sm">{t('signup.features.facility.desc', 'Streamline your operations')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Globe size={24} />
              </div>
              <div>
                <h3 className="font-semibold">{t('signup.features.marketplace.title', 'Marketplace')}</h3>
                <p className="text-white/80 text-sm">{t('signup.features.marketplace.desc', 'Connect with trusted vendors')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Phone size={24} />
              </div>
              <div>
                <h3 className="font-semibold">{t('signup.features.support.title', 'Support')}</h3>
                <p className="text-white/80 text-sm">{t('signup.features.support.desc', '24/7 customer service')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
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
                          lang.code === selectedLang.code ? 'bg-brand-500/10' : ''
                        }`}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{lang.native}</div>
                          <div className="text-xs text-gray-500">{lang.code.toUpperCase()}</div>
                        </div>
                        {lang.code === selectedLang.code && (
                          <div className="w-2 h-2 rounded-full bg-brand-500" />
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
                          currency.code === selectedCurrency.code ? 'bg-brand-500/10' : ''
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

            <Link href="/login" className="text-white/80 hover:text-white text-sm flex items-center gap-1">
              <ArrowLeft size={14} />
              {t('signup.backToLogin', 'Back to Login')}
            </Link>
          </div>

          {/* Signup Form */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('signup.form.title', 'Create Your Account')}</h2>
              <p className="text-gray-600">{t('signup.form.subtitle', 'Join Fixzit Enterprise today')}</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
              {/* User Type Selection */}
              <div>
                <Label htmlFor="userType" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('signup.fields.accountType', 'Account Type')}
                </Label>
                <Select value={formData.userType} onValueChange={(value) => handleChange('userType', value)}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}{type.description ? ` - ${type.description}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('signup.fields.firstName', 'First Name')} *
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder={t('signup.placeholders.firstName', 'Enter your first name')}
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    className="h-12"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('signup.fields.lastName', 'Last Name')} *
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder={t('signup.placeholders.lastName', 'Enter your last name')}
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    className="h-12"
                    required
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('signup.fields.email', 'Email Address')} *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('signup.placeholders.email', 'Enter your email address')}
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div>
                <Label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('signup.fields.phone', 'Phone Number')} *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={t('signup.placeholders.phone', '+966 XX XXX XXXX')}
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>

              {/* Company Name (for corporate accounts) */}
              {formData.userType === 'corporate' && (
                <div>
                  <Label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('signup.fields.companyName', 'Company Name')} *
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="companyName"
                      type="text"
                      placeholder={t('signup.placeholders.companyName', 'Enter your company name')}
                      value={formData.companyName}
                      onChange={(e) => handleChange('companyName', e.target.value)}
                      className="pl-10 h-12"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Password Fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('signup.fields.password', 'Password')} *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('signup.placeholders.password', 'Create a strong password')}
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      className="pl-10 pr-10 h-12"
                      required
                      minLength={8}
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

                <div>
                  <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('signup.fields.confirmPassword', 'Confirm Password')} *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={t('signup.placeholders.confirmPassword', 'Confirm your password')}
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      className="pl-10 pr-10 h-12"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-[var(--fixzit-danger-lightest)] border border-red-200 rounded-lg text-[var(--fixzit-danger-dark)]">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Terms and Newsletter */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={(e) => handleChange('termsAccepted', e.target.checked)}
                    className="mt-1 h-4 w-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                    required
                  />
                  <span className="text-sm text-gray-600">
                    {t('signup.terms.agree', 'I agree to the')}{' '}
                    <Link href="/terms" className="text-brand-500 hover:text-brand-600 transition-colors">
                      {t('signup.terms.service', 'Terms of Service')}
                    </Link>{' '}
                    {t('signup.terms.and', 'and')}{' '}
                    <Link href="/privacy" className="text-brand-500 hover:text-brand-600 transition-colors">
                      {t('signup.terms.privacy', 'Privacy Policy')}
                    </Link>
                    *
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.newsletter}
                    onChange={(e) => handleChange('newsletter', e.target.checked)}
                    className="mt-1 h-4 w-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-600">
                    {t('signup.newsletter', "I'd like to receive updates and promotional emails about Fixzit Enterprise")}
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('signup.button.creating', 'Creating Account...')}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    {t('signup.button.create', 'Create Account')}
                  </div>
                )}
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                {t('signup.login.prompt', 'Already have an account?')}{' '}
                <Link href="/login" className="text-brand-500 hover:text-brand-600 font-medium transition-colors">
                  {t('signup.login.link', 'Sign in here')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
