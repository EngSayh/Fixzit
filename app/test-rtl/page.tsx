'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useResponsive } from '@/contexts/ResponsiveContext';
import { ResponsiveContainer} from '@/components/ui/ResponsiveContainer';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

export default function RTLTestPage() {
  const { t, language, setLanguage, isRTL } = useTranslation();
  const { screenSize, isMobile, isTablet } = useResponsive();
  const auto = useAutoTranslator('testRtl');
  
  // Avoid SSR hydration mismatch - read document only on client
  const [mounted, setMounted] = useState(false);
  const [dir, setDir] = useState('ltr');
  const [htmlLang, setHtmlLang] = useState('en');
  
  useEffect(() => {
    setMounted(true);
    setDir(document.documentElement.dir || 'ltr');
    setHtmlLang(document.documentElement.lang || 'en');
  }, [language, isRTL]);  // Re-read when language changes

  const testTranslations = [
    'nav.dashboard',
    'nav.work-orders',
    'nav.properties',
    'nav.tenants',
    'nav.vendors',
    'nav.support',
    'common.brand',
    'common.search',
    'common.save',
    'common.cancel',
    'landing.title',
    'landing.subtitle'
  ];

  const currentLanguageLabel = auto('Current Language: {{lang}}', 'currentLanguage').replace(
    '{{lang}}',
    language.toUpperCase()
  );
  const rtlStatus = isRTL
    ? auto('✅ RTL Active', 'rtl.active')
    : auto('❌ RTL Inactive', 'rtl.inactive');

  return (
    <ResponsiveContainer className="py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          {auto('RTL & Language Test Page', 'title')}
        </h1>

        <div className="bg-card rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{currentLanguageLabel}</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setLanguage('ar')}
              className={`px-4 py-2 rounded ${language === 'ar' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            >
              {auto('Arabic (العربية)', 'language.ar')}
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded ${language === 'en' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            >
              {auto('English', 'language.en')}
            </button>
          </div>

          <div className="mb-4">
            <strong>{auto('RTL Status:', 'rtl.label')} </strong>
            {rtlStatus}
          </div>

          <div className="mb-4">
            <strong>{auto('Direction:', 'direction.label')} </strong>
            {mounted ? dir : 'ltr'}
          </div>

          <div className="mb-4">
            <strong>{auto('Language:', 'htmlLanguage.label')} </strong>
            {mounted ? htmlLang : 'en'}
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            {auto('Translation Test:', 'translationTest.title')}
          </h3>
          <div className="space-y-2">
            {testTranslations.map((key) => (
              <div key={key} className="flex justify-between border-b pb-2">
                <span className="font-mono text-sm text-muted-foreground">{key}:</span>
                <span className={`${isRTL ? 'text-right' : 'text-left'}`}>{t(key, `FALLBACK: ${key}`)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-lg p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">
            {auto('Layout Test:', 'layout.title')}
          </h3>
          <div className={`border-2 border-dashed p-4 rounded ${isRTL ? 'text-right' : 'text-left'}`}>
            <p>
              {auto('This text should align {{direction}} in {{lang}}', 'layout.alignText')
                .replace('{{direction}}', isRTL ? auto('right', 'layout.right') : auto('left', 'layout.left'))
                .replace('{{lang}}', language.toUpperCase())}
            </p>
            <p className="mt-2">
              {auto('Current direction: {{dir}}', 'layout.currentDirection').replace(
                '{{dir}}',
                mounted ? dir : 'ltr'
              )}
            </p>
            <p className="mt-2">
              {auto('Screen size: {{size}} ({{device}})', 'layout.screenSize')
                .replace('{{size}}', screenSize)
                .replace(
                  '{{device}}',
                  isMobile
                    ? auto('Mobile', 'layout.device.mobile')
                    : isTablet
                      ? auto('Tablet', 'layout.device.tablet')
                      : auto('Desktop', 'layout.device.desktop')
                )}
            </p>
          </div>
        </div>
      </div>
    </ResponsiveContainer>
  );
}
