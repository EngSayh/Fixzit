'use client&apos;;

import { useTranslation } from &apos;@/src/contexts/TranslationContext&apos;;
import { useResponsive } from &apos;@/src/contexts/ResponsiveContext&apos;;
import { ResponsiveContainer, ResponsiveText } from &apos;@/src/components/ui/ResponsiveContainer&apos;;

export default function RTLTestPage() {
  const { t, language, setLanguage, isRTL } = useTranslation();
  const { screenInfo } = useResponsive();

  const testTranslations = [
    &apos;nav.dashboard&apos;,
    &apos;nav.work-orders&apos;,
    &apos;nav.properties&apos;,
    &apos;nav.tenants&apos;,
    &apos;nav.vendors&apos;,
    &apos;nav.support&apos;,
    &apos;common.brand&apos;,
    &apos;common.search&apos;,
    &apos;common.save&apos;,
    &apos;common.cancel&apos;,
    &apos;landing.title&apos;,
    &apos;landing.subtitle&apos;
  ];

  return (
    <ResponsiveContainer className="py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">RTL & Language Test Page</h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Language: {language.toUpperCase()}</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setLanguage(&apos;ar&apos;)}
              className={`px-4 py-2 rounded ${language === 'ar&apos; ? &apos;bg-blue-500 text-white&apos; : &apos;bg-gray-200&apos;}`}
            >
              Arabic (العربية)
            </button>
            <button
              onClick={() => setLanguage(&apos;en&apos;)}
              className={`px-4 py-2 rounded ${language === 'en&apos; ? &apos;bg-blue-500 text-white&apos; : &apos;bg-gray-200&apos;}`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage(&apos;fr&apos;)}
              className={`px-4 py-2 rounded ${language === 'fr&apos; ? &apos;bg-blue-500 text-white&apos; : &apos;bg-gray-200&apos;}`}
            >
              French (Français)
            </button>
          </div>

          <div className="mb-4">
            <strong>RTL Status:</strong> {isRTL ? '✅ RTL Active&apos; : &apos;❌ RTL Inactive&apos;}
          </div>

          <div className="mb-4">
            <strong>Direction:</strong> {document.documentElement.dir || 'ltr&apos;}
          </div>

          <div className="mb-4">
            <strong>Language:</strong> {document.documentElement.lang || 'en&apos;}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Translation Test:</h3>
          <div className="space-y-2">
            {testTranslations.map((key) => (
              <div key={key} className="flex justify-between border-b pb-2">
                <span className="font-mono text-sm text-gray-600">{key}:</span>
                <span className={`${isRTL ? 'text-right&apos; : &apos;text-left&apos;}`}>{t(key, `FALLBACK: ${key}`)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Layout Test:</h3>
          <div className={`border-2 border-dashed p-4 rounded ${isRTL ? 'text-right&apos; : &apos;text-left&apos;}`}>
            <p>This text should align {isRTL ? &apos;right&apos; : &apos;left&apos;} in {language.toUpperCase()}</p>
            <p className="mt-2">Current direction: {document.documentElement.dir}</p>
            <p className="mt-2">Screen size: {screenInfo.size} ({screenInfo.width}x{screenInfo.height})</p>
          </div>
        </div>
      </div>
    </ResponsiveContainer>
  );
}
