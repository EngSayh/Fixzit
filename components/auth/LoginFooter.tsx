'use client';

import Link from 'next/link';
import { useTranslation } from '@/contexts/TranslationContext';

interface LoginFooterProps {
  showDemoLink?: boolean;
}

export default function LoginFooter({ showDemoLink = false }: LoginFooterProps) {
  const { t, isRTL } = useTranslation();

  return (
    <div>
      {/* Sign Up Link */}
      <div className="mt-6 text-center">
        <p className="text-gray-600 text-sm">
          {t('login.noAccount', "Don't have an account?")}{' '}
          <Link 
            href="/signup" 
            className="text-brand-500 hover:text-brand-600 font-medium transition-colors"
          >
            {t('login.signUp', 'Sign up here')}
          </Link>
        </p>
      </div>

      {/* Developer Link (Development Only) */}
      {showDemoLink && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link 
            href="/dev/login-helpers" 
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-1"
          >
            <span>🔧</span>
            {t('login.devHelpers', 'Developer? Access test accounts')}
          </Link>
        </div>
      )}

      {/* Back to Home Link */}
      <div className="mt-6 text-center">
        <Link 
          href="/" 
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          {isRTL ? `${t('common.backToHome', 'Back to Home')} ←` : `← ${t('common.backToHome', 'Back to Home')}`}
        </Link>
      </div>
    </div>
  );
}
