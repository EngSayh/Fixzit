'use client';

import { useTranslation } from '@/contexts/TranslationContext';

export default function LoginHeader() {
  const { t } = useTranslation();

  return (
    <div className="text-center mb-6">
      {/* Logo */}
      <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
        <span className="text-white text-3xl font-bold" aria-label="Fixzit Logo">Fz</span>
      </div>
      
      {/* Title */}
      <h1 className="text-3xl font-bold text-foreground mb-2">
        {t('login.welcome', 'Welcome Back')}
      </h1>
      
      {/* Subtitle */}
      <p className="text-muted-foreground">
        {t('login.subtitle', 'Sign in to your Fixzit account')}
      </p>
    </div>
  );
}
