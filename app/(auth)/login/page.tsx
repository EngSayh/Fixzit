"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useTranslation } from "../../../contexts/I18nContext";
import { GlassButton, GlassPanel, GlassInput } from "../../../src/components/theme";

// Icons for OAuth providers
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
  </svg>
);

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const { t, isRTL } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Store token in localStorage
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        router.push(next);
      } else {
        setError(data.error?.message || "Invalid credentials");
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'apple') => {
    // Placeholder for OAuth implementation
    console.log(`Login with ${provider}`);
    setError(`${provider} login is not yet implemented`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Aurora Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0061A8] via-[#004080] to-[#002850]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      
      {/* Login Panel */}
      <GlassPanel 
        className="w-full max-w-md relative z-10 p-8 bg-white/10 backdrop-blur-xl border border-white/20" 
        blur="xl" 
        gradient
        glow
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-[#00A859] to-[#0061A8] rounded-3xl shadow-2xl mb-4 animate-float">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">FIXZIT</h1>
          <p className="text-white/80 text-sm">{isRTL ? 'تسجيل الدخول إلى حسابك' : 'Sign in to your account'}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              {isRTL ? 'البريد الإلكتروني' : 'Email'}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00A859]/50 focus:border-[#00A859] backdrop-blur-sm"
                placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              {isRTL ? 'كلمة المرور' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00A859]/50 focus:border-[#00A859] backdrop-blur-sm"
                placeholder={isRTL ? 'أدخل كلمة المرور' : 'Enter your password'}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Sign In Button */}
          <GlassButton
            type="submit"
            size="lg"
            className="w-full bg-gradient-to-r from-[#00A859] to-[#0061A8] text-white hover:from-[#00A859]/90 hover:to-[#0061A8]/90 py-3 font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (isRTL ? 'جارٍ تسجيل الدخول...' : 'Signing in...') : (isRTL ? 'تسجيل الدخول' : 'Sign In')}
          </GlassButton>

          {/* Forgot Password Link */}
          <div className="text-center">
            <a 
              href="/forgot-password" 
              className="text-white/80 hover:text-white text-sm transition-colors"
            >
              {isRTL ? 'هل نسيت كلمة المرور؟' : 'Forgot Password?'}
            </a>
          </div>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-transparent text-white/60">{isRTL ? 'أو' : 'OR'}</span>
          </div>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <GlassButton
            type="button"
            size="lg"
            variant="secondary"
            className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20 py-3"
            onClick={() => handleOAuthLogin('google')}
          >
            <div className="flex items-center justify-center gap-3">
              <GoogleIcon />
              <span>{isRTL ? 'المتابعة مع Google' : 'Continue with Google'}</span>
            </div>
          </GlassButton>

          <GlassButton
            type="button"
            size="lg"
            variant="secondary"
            className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20 py-3"
            onClick={() => handleOAuthLogin('apple')}
          >
            <div className="flex items-center justify-center gap-3">
              <AppleIcon />
              <span>{isRTL ? 'المتابعة مع Apple' : 'Continue with Apple'}</span>
            </div>
          </GlassButton>
        </div>

        {/* Sign Up Link */}
        <div className="text-center mt-6 pt-6 border-t border-white/10">
          <p className="text-white/80 text-sm">
            {isRTL ? "ليس لديك حساب؟ " : "Don't have an account? "}
            <a 
              href="/signup" 
              className="text-[#00A859] hover:text-[#00A859]/80 font-semibold transition-colors"
            >
              {isRTL ? 'إنشاء حساب' : 'Sign Up'}
            </a>
          </p>
        </div>
      </GlassPanel>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}