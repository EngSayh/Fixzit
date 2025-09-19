"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslation } from '../../contexts/I18nContext';
import { GlassCard, GlassButton } from '../../src/components/theme';
import ErrorBoundary from '../../src/components/error/ErrorBoundary';
import { LoadingState } from '../../src/components/loading/LoadingState';
import type { LoadingState as LoadingStateType, ErrorState } from '../../lib/types/ui';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, isRTL, locale, switchLanguage } = useTranslation();
  
  const [loadingState, setLoadingState] = useState<LoadingStateType>({
    isLoading: true,
    loadingText: 'Checking authentication status...',
    stage: 'Security verification'
  });

  // Get configurable app info
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "FIXZIT SOUQ";
  const appVersion = process.env.NEXT_PUBLIC_VERSION || "2.0.26";

  // Check if user is already authenticated and redirect
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        setLoadingState({
          isLoading: true,
          loadingText: 'Checking existing session...',
          stage: 'Authentication check'
        });

        const response = await fetch('/api/auth/session', {
          credentials: 'include',
          cache: 'no-store'
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.authenticated) {
            // User is already authenticated, redirect to app
            const nextUrl = searchParams.get('next') || '/dashboard';
            router.replace(nextUrl);
            return;
          }
        }

        // Not authenticated, show auth pages
        setLoadingState({ isLoading: false });
        
      } catch (error: any) {
        console.warn('Auth check failed:', error);
        
        // Don't block auth pages if session check fails
        setLoadingState({ isLoading: false });
      }
    };

    checkExistingAuth();
  }, [router, searchParams]);

  // Apply security headers and policies
  useEffect(() => {
    // Safe iframe detection without cross-frame navigation (prevents SecurityError)
    try {
      const isInIframe = window.self !== window.top;
      if (isInIframe) {
        // Log security warning but don't break out of iframe in sandboxed environments
        console.warn('Auth page detected in iframe. This may be a security risk.');
        // In production, you might want to show a warning message to users
        // For now, we allow iframe usage to prevent SecurityError in development
      }
    } catch (e) {
      // SecurityError means we're definitely in an iframe - this is expected in Replit
      console.info('Running in sandboxed iframe environment');
    }

    // Add security meta tags dynamically
    const addSecurityMeta = () => {
      // Content Security Policy
      let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!cspMeta) {
        cspMeta = document.createElement('meta');
        cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
        cspMeta.setAttribute('content', "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'");
        document.head.appendChild(cspMeta);
      }

      // X-Frame-Options
      let frameOptionsMeta = document.querySelector('meta[http-equiv="X-Frame-Options"]');
      if (!frameOptionsMeta) {
        frameOptionsMeta = document.createElement('meta');
        frameOptionsMeta.setAttribute('http-equiv', 'X-Frame-Options');
        frameOptionsMeta.setAttribute('content', 'DENY');
        document.head.appendChild(frameOptionsMeta);
      }
    };

    addSecurityMeta();
  }, []);

  // Keyboard navigation for auth forms
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Allow tab navigation but enhance it for auth forms
      if (event.key === 'Tab') {
        const focusableElements = document.querySelectorAll(
          'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey && document.activeElement === firstElement) {
          lastElement?.focus();
          event.preventDefault();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          firstElement?.focus();
          event.preventDefault();
        }
      }

      // Enter key should submit forms
      if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
        const form = event.target.closest('form');
        if (form) {
          const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
          if (submitButton && !submitButton.disabled) {
            submitButton.click();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show loading state while checking authentication
  if (loadingState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0061A8] via-[#0ea5e9] to-[#00A859] flex items-center justify-center p-4">
        <LoadingState
          {...loadingState}
          variant="full"
          size="lg"
        />
      </div>
    );
  }

  return (
    <ErrorBoundary 
      level="critical" 
      onError={(error, errorInfo) => {
        // Log auth-related errors
        console.error('Auth layout error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        });
      }}
    >
      <div 
        className={`min-h-screen relative ${isRTL ? 'rtl' : 'ltr'}`}
        role="main"
        aria-label={`${appName} Authentication`}
      >
        {/* Enhanced Background with floating elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0061A8] via-[#0ea5e9] to-[#00A859]">
          {/* Floating Glass Elements for Visual Enhancement */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl animate-float" />
          <div className="absolute top-40 right-32 w-24 h-24 bg-white/5 rounded-full blur-lg animate-float-delayed" />
          <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-white/5 rounded-full blur-2xl animate-float-slow" />
        </div>

        {/* Security Badge */}
        <div className="absolute top-4 right-4 z-10">
          <GlassCard className="p-2 bg-white/10">
            <div className="flex items-center gap-2 text-white/80">
              <Shield className="w-4 h-4" />
              <span className="text-xs">Secure Connection</span>
            </div>
          </GlassCard>
        </div>

        {/* Language Switcher */}
        <div className="absolute top-4 left-4 z-10">
          <GlassCard className="p-2 bg-white/10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => switchLanguage('en')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  locale === 'en' 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/60 hover:text-white/80'
                }`}
                aria-label="Switch to English"
              >
                EN
              </button>
              <button
                onClick={() => switchLanguage('ar')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  locale === 'ar' 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/60 hover:text-white/80'
                }`}
                aria-label="Switch to Arabic"
              >
                ع
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Main Auth Content Container */}
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md">
            {/* App Branding */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-white/20 to-white/10 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl backdrop-blur-sm border border-white/20">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                {appName}
              </h1>
              <p className="text-white/80 text-sm">
                {isRTL ? 'إدارة العقارات للمؤسسات' : 'Enterprise Property Management'}
              </p>
              <p className="text-white/60 text-xs mt-1">Version {appVersion}</p>
            </div>

            {/* Auth Form Container with Enhanced Error Boundary */}
            <ErrorBoundary 
              level="page"
              fallback={({ error, retry }) => (
                <GlassCard className="p-6 border-red-200 bg-red-50/10 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Authentication Error
                  </h3>
                  <p className="text-white/80 text-sm mb-4">
                    {error.message || 'Something went wrong with the authentication system.'}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <GlassButton onClick={retry} variant="primary" size="sm">
                      Try Again
                    </GlassButton>
                    <GlassButton 
                      onClick={() => window.location.reload()} 
                      variant="ghost" 
                      size="sm"
                    >
                      Reload Page
                    </GlassButton>
                  </div>
                </GlassCard>
              )}
            >
              {children}
            </ErrorBoundary>

            {/* Security Notice */}
            <div className="mt-8 text-center">
              <p className="text-white/60 text-xs leading-relaxed">
                {isRTL 
                  ? 'محمي بتشفير 256-بت SSL وأحدث معايير الأمان'
                  : 'Protected by 256-bit SSL encryption and latest security standards'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Accessibility Announcements */}
        <div 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
          id="auth-announcements"
        />

        {/* Footer */}
        <footer className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="text-center">
            <p className="text-white/40 text-xs">
              © 2024 {appName}. {isRTL ? 'جميع الحقوق محفوظة' : 'All rights reserved'}.
            </p>
          </div>
        </footer>
      </div>

      {/* Custom Styles for Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(1deg); }
          66% { transform: translateY(5px) rotate(-1deg); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(8px) rotate(-1deg); }
          66% { transform: translateY(-5px) rotate(1deg); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(0.5deg); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
          animation-delay: 2s;
        }
        
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
          animation-delay: 4s;
        }
      `}</style>
    </ErrorBoundary>
  );
}