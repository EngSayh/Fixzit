// src/components/LanguageSelectorV4.tsx - STRICT v4 compliant language selector
'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useI18n } from '@/src/providers/RootProviders';
import Image from 'next/image';

// Language configuration matching STRICT v4 requirements
const LANGUAGES = [
  {
    code: 'en' as const,
    iso: 'EN',
    nativeName: 'English',
    countryName: 'United Kingdom',
    flag: '/flags/uk.svg',
    dir: 'ltr' as const,
  },
  {
    code: 'ar' as const,
    iso: 'AR',
    nativeName: 'العربية',
    countryName: 'المملكة العربية السعودية',
    flag: '/flags/sa.svg',
    dir: 'rtl' as const,
  },
];

export default function LanguageSelectorV4() {
  const { language, setLanguage, isRTL } = useI18n();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get current language
  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  // Filter languages based on search
  const filteredLanguages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return LANGUAGES;

    return LANGUAGES.filter(lang => 
      lang.code.toLowerCase().includes(query) ||
      lang.iso.toLowerCase().includes(query) ||
      lang.nativeName.toLowerCase().includes(query) ||
      lang.countryName.toLowerCase().includes(query) ||
      // Special handling for Arabic search
      (lang.code === 'ar' && ['ع', 'عربي', 'arabic'].some(term => term.includes(query)))
    );
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle language change
  const handleLanguageChange = (langCode: 'en' | 'ar') => {
    setLanguage(langCode);
    setOpen(false);
    setSearchQuery('');
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[#0061A8]"
        aria-label="Change language"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {/* Flag */}
        <div className="w-5 h-3.5 overflow-hidden rounded-sm">
          {currentLang.flag.endsWith('.svg') ? (
            <Image
              src={currentLang.flag}
              alt=""
              width={20}
              height={14}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-base">{currentLang.code === 'en' ? '🇬🇧' : '🇸🇦'}</span>
          )}
        </div>
        
        {/* Native name */}
        <span>{currentLang.nativeName}</span>
        
        {/* ISO code */}
        <span className="text-xs text-gray-500">({currentLang.iso})</span>
        
        {/* Dropdown arrow */}
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          className={`absolute ${isRTL ? 'right-0' : 'left-0'} z-50 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}
          role="listbox"
          aria-label="Select language"
          onKeyDown={handleKeyDown}
        >
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRTL ? 'ابحث عن لغة... (ar / en / ع)' : 'Type to filter... (ar / en / ع)'}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Language List */}
          <div className="max-h-60 overflow-auto py-1">
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((lang) => {
                const isSelected = lang.code === language;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 ${
                      isSelected ? 'bg-gray-50' : ''
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    {/* Flag */}
                    <div className="w-6 h-4 overflow-hidden rounded-sm flex-shrink-0">
                      {lang.flag.endsWith('.svg') ? (
                        <Image
                          src={lang.flag}
                          alt=""
                          width={24}
                          height={16}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg">{lang.code === 'en' ? '🇬🇧' : '🇸🇦'}</span>
                      )}
                    </div>

                    {/* Language Info */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{lang.nativeName}</span>
                        <span className="text-xs text-gray-500">({lang.iso})</span>
                      </div>
                      <div className="text-xs text-gray-500">{lang.countryName}</div>
                    </div>

                    {/* Selected checkmark */}
                    {isSelected && (
                      <svg
                        className="w-5 h-5 text-[#00A859]"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500">
                {isRTL ? 'لا توجد نتائج' : 'No results found'}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              {isRTL 
                ? 'اختر لغتك المفضلة' 
                : 'Select your preferred language'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
