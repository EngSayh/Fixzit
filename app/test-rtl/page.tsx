'use client';

import { useTranslation } from '@/contexts/TranslationContext';
import { useResponsiveLayout } from '@/contexts/ResponsiveContext';
import { ResponsiveContainer} from '@/components/ui/ResponsiveContainer';

export default function RTLTestPage() {
  const { t, language, setLanguage, isRTL } = useTranslation();
  const { screenInfo } = useResponsiveLayout();

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

  return (
    <ResponsiveContainer className="py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">RTL & Language Test Page</h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Language: {language.toUpperCase()}</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setLanguage('ar')}
              className={`px-4 py-2 rounded ${language === 'ar' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Arabic (العربية)
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded ${language === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              English
            </button>
          </div>

          <div className="mb-4">
            <strong>RTL Status:</strong> {isRTL ? '✅ RTL Active' : '❌ RTL Inactive'}
          </div>

          <div className="mb-4">
            <strong>Direction:</strong> {document.documentElement.dir || 'ltr'}
          </div>

          <div className="mb-4">
            <strong>Language:</strong> {document.documentElement.lang || 'en'}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Translation Test:</h3>
          <div className="space-y-2">
            {testTranslations.map((key) => (
              <div key={key} className="flex justify-between border-b pb-2">
                <span className="font-mono text-sm text-gray-600">{key}:</span>
                <span className={`${isRTL ? 'text-right' : 'text-left'}`}>{t(key, `FALLBACK: ${key}`)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Layout Test:</h3>
          <div className={`border-2 border-dashed p-4 rounded ${isRTL ? 'text-right' : 'text-left'}`}>
            <p>This text should align {isRTL ? 'right' : 'left'} in {language.toUpperCase()}</p>
            <p className="mt-2">Current direction: {document.documentElement.dir}</p>
            <p className="mt-2">Screen size: {screenInfo.size} ({screenInfo.width}x{screenInfo.height})</p>
          </div>
        </div>
      </div>
    </ResponsiveContainer>
  );
}

