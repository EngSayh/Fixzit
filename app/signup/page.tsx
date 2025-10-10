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

type Lang = { code: string; native: string; flag: string; dir: 'ltr' | 'rtl' };
const LANGUAGES: Lang[] = [
  { code: 'ar', native: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'en', native: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'fr', native: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'es', native: 'Español', flag: '🇪🇸', dir: 'ltr' },
];

const CURRENCIES = [
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

const USER_TYPES = [
  { value: 'personal', label: 'Personal Account', description: 'For individual users' },
  { value: 'corporate', label: 'Corporate Account', description: 'For businesses and organizations' },
  { value: 'vendor', label: 'Vendor Account', description: 'For service providers and suppliers' },
];

export default function SignupPage() {
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
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.lastName.trim()) return 'Last name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Please enter a valid email';
    if (!formData.phone.trim()) return 'Phone number is required';
    if (formData.userType === 'corporate' && !formData.companyName.trim()) return 'Company name is required for corporate accounts';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    if (!formData.termsAccepted) return 'Please accept the terms and conditions';
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
      <div className="min-h-screen bg-gradient-to-br from-[#0061A8] via-[#00A859] to-[#FFB400] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created Successfully!</h2>
            <p className="text-gray-600 mb-6">
              Welcome to Fixzit Enterprise! Your account has been created and you can now sign in.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting you to the login page...
            </p>
          </div>
        </div>
      </div>
    );
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
            <h1 className="text-4xl font-bold mb-4">Join Fixzit Enterprise</h1>
            <p className="text-xl text-white/90 mb-8">
              Create your account and start managing your facilities and marketplace operations
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="font-semibold">Facility Management</h3>
                <p className="text-white/80 text-sm">Streamline your operations</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Globe size={24} />
              </div>
              <div>
                <h3 className="font-semibold">Marketplace</h3>
                <p className="text-white/80 text-sm">Connect with trusted vendors</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Phone size={24} />
              </div>
              <div>
                <h3 className="font-semibold">Support</h3>
                <p className="text-white/80 text-sm">24/7 customer service</p>
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

            <Link href="/login" className="text-white/80 hover:text-white text-sm flex items-center gap-1">
              <ArrowLeft size={14} />
              Back to Login
            </Link>
          </div>

          {/* Signup Form */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
              <p className="text-gray-600">Join Fixzit Enterprise today</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
              {/* User Type Selection */}
              <div>
                <Label htmlFor="userType" className="block text-sm font-medium text-gray-700 mb-2">
                  Account Type
                </Label>
                <Select value={formData.userType} onValueChange={(value) => handleChange('userType', value)}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-gray-500">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Enter your first name"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    className="h-12"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Enter your last name"
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
                  Email Address *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
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
                  Phone Number *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+966 XX XXX XXXX"
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
                    Company Name *
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Enter your company name"
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
                    Password *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
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
                    Confirm Password *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
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
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
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
                    className="mt-1 h-4 w-4 text-[#0061A8] border-gray-300 rounded focus:ring-[#0061A8]"
                    required
                  />
                  <span className="text-sm text-gray-600">
                    I agree to the{' '}
                    <Link href="/terms" className="text-[#0061A8] hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-[#0061A8] hover:underline">
                      Privacy Policy
                    </Link>
                    *
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.newsletter}
                    onChange={(e) => handleChange('newsletter', e.target.checked)}
                    className="mt-1 h-4 w-4 text-[#0061A8] border-gray-300 rounded focus:ring-[#0061A8]"
                  />
                  <span className="text-sm text-gray-600">
                    I&apos;d like to receive updates and promotional emails about Fixzit Enterprise
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#0061A8] hover:bg-[#0061A8]/90 text-white font-semibold"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Account...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Create Account
                  </div>
                )}
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-[#0061A8] hover:underline font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
