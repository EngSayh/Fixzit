'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Language {
  code: string;
  name: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
];

interface LanguageSelectorProps {
  /**
   * Current language code
   */
  currentLanguage?: string;
  
  /**
   * Callback when language changes
   */
  onChange?: (language: string) => void;
  
  /**
   * Show as dropdown or inline
   */
  variant?: 'dropdown' | 'inline';
  
  /**
   * Show language names or just flags
   */
  showNames?: boolean;
}

/**
 * Language Selector Component for TopBar
 * 
 * Allows users to switch between English and Arabic with proper RTL/LTR support
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage = 'en',
  onChange,
  variant = 'dropdown',
  showNames = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  
  const current = languages.find(l => l.code === currentLanguage) || languages[0];

  const handleLanguageChange = async (lang: Language) => {
    // Update HTML dir attribute
    document.documentElement.dir = lang.dir;
    document.documentElement.lang = lang.code;
    
    // Save to localStorage
    localStorage.setItem('preferredLanguage', lang.code);
    
    // Update via API
    try {
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang.code }),
      });
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
    
    // Call onChange callback
    if (onChange) {
      onChange(lang.code);
    }
    
    // Refresh the page to apply language changes
    router.refresh();
    setIsOpen(false);
  };

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              lang.code === currentLanguage
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <span className="mr-1">{lang.flag}</span>
            {showNames && lang.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <span className="text-lg">{current.flag}</span>
        {showNames && <span>{current.name}</span>}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  lang.code === currentLanguage
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300'
                } ${languages.indexOf(lang) === 0 ? 'rounded-t-md' : ''} ${
                  languages.indexOf(lang) === languages.length - 1 ? 'rounded-b-md' : ''
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="flex-1 text-left">{lang.name}</span>
                {lang.code === currentLanguage && (
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
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

export default LanguageSelector;
