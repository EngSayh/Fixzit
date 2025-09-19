'use client';

import React, { useState } from 'react';
import { useTranslation } from '../../../contexts/I18nContext';

const LanguageSwitcher: React.FC = () => {
  const { locale, switchLanguage, isRTL } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en' as const, name: 'English', flag: '🇺🇸', nativeName: 'English' },
    { code: 'ar' as const, name: 'العربية', flag: '🇸🇦', nativeName: 'العربية' },
  ];

  const currentLanguage = languages.find(lang => lang.code === locale);

  const handleLanguageChange = (langCode: 'en' | 'ar') => {
    switchLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg 
          bg-gray-100 hover:bg-gray-200 
          text-gray-700 hover:text-gray-900 
          transition-all duration-200 
          border border-gray-200 hover:border-gray-300
          ${isRTL ? 'flex-row-reverse' : ''}
        `}
        aria-label="Switch Language"
      >
        <span className="text-lg">{currentLanguage?.flag}</span>
        <span className="text-sm font-medium hidden sm:block">
          {currentLanguage?.nativeName}
        </span>
        <svg 
          className={`
            w-4 h-4 transition-transform duration-200 
            ${isOpen ? 'rotate-180' : ''} 
            ${isRTL ? 'rtl-mirror' : ''}
          `}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div 
            className={`
              absolute top-full mt-2 w-48 
              bg-white rounded-lg shadow-lg border border-gray-200 
              py-2 z-50
              ${isRTL ? 'right-0' : 'left-0'}
            `}
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`
                  w-full px-4 py-3 text-left hover:bg-gray-50 
                  flex items-center gap-3 transition-colors
                  ${locale === lang.code ? 'bg-primary-50 text-primary-700' : 'text-gray-700'}
                  ${isRTL ? 'text-right flex-row-reverse' : ''}
                `}
              >
                <span className="text-lg">{lang.flag}</span>
                <div className={isRTL ? 'text-right' : ''}>
                  <div className="font-medium">{lang.nativeName}</div>
                  <div className="text-xs text-gray-500">{lang.name}</div>
                </div>
                {locale === lang.code && (
                  <svg 
                    className={`w-4 h-4 text-primary-600 ${isRTL ? 'mr-auto' : 'ml-auto'}`}
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;