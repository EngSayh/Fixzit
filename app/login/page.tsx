'use client';

import { useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import CompactLanguageSelector from '@/components/i18n/CompactLanguageSelector';
import CompactCurrencySelector from '@/components/i18n/CompactCurrencySelector';
import LoginHeader from '@/components/auth/LoginHeader';
import LoginForm from '@/components/auth/LoginForm';
import SSOButtons from '@/components/auth/SSOButtons';
import LoginFooter from '@/components/auth/LoginFooter';
import LoginSuccess from '@/components/auth/LoginSuccess';
import SkipNavigation from '@/components/accessibility/SkipNavigation';

export default function LoginPage() {
  const [success, setSuccess] = useState(false);
  const { isRTL } = useTranslation();

  // Check if demo login is enabled
  const showDemoLink = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true' || 
                       process.env.NODE_ENV === 'development';

  // Show success screen
  if (success) {
    return <LoginSuccess />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <SkipNavigation />
      
      <div className="w-full max-w-md">
        {/* Language/Currency Selectors - Top Right */}
        <div className={`flex items-center justify-end gap-2 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <CompactLanguageSelector />
          <CompactCurrencySelector />
        </div>

        {/* Login Card */}
        <main id="main-content" className="bg-white rounded-2xl shadow-xl p-8" role="main" aria-label="Login">
          <LoginHeader />
          <LoginForm onSuccess={() => setSuccess(true)} />
          <SSOButtons />
          <LoginFooter showDemoLink={showDemoLink} />
        </main>
      </div>
    </div>
  );
}
