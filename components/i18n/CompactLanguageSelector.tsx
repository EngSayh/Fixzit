'use client';

import { Globe } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

// Simplified language options for auth pages
const AUTH_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', direction: 'ltr' },
  { code: 'ar', name: 'Arabic', native: 'العربية', direction: 'rtl' },
  { code: 'fr', name: 'French', native: 'Français', direction: 'ltr' },
];

interface CompactLanguageSelectorProps {
  className?: string;
}

/**
 * Simplified language selector for authentication pages.
 * Shows only 2-3 common languages in a simple dropdown without search functionality.
 */
export default function CompactLanguageSelector({ className = '' }: CompactLanguageSelectorProps) {
  const { language, setLanguage } = useTranslation();

  const handleChange = (newLanguage: string) => {
    const selectedLang = AUTH_LANGUAGES.find(lang => lang.code === newLanguage);
    if (!selectedLang) return;

    // Update language in context (cast to expected type)
    if (setLanguage) {
      setLanguage(newLanguage as any);
    }

    // Update document attributes immediately
    document.documentElement.setAttribute('lang', newLanguage);
    document.documentElement.setAttribute('dir', selectedLang.direction);

    // Persist to localStorage as fallback
    try {
      localStorage.setItem('fixzit-language', newLanguage);
    } catch (err) {
      console.error('Failed to save language preference:', err);
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200 hover:border-gray-300 transition-colors">
        <Globe className="h-4 w-4 text-gray-600" />
        <select
          value={language}
          onChange={(e) => handleChange(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-gray-700 font-medium cursor-pointer pr-1"
          aria-label="Select language"
        >
          {AUTH_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.native}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
