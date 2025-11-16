'use client';

import { useTranslation } from '@/contexts/TranslationContext';

export default function TranslationTestPage() {
  const { t, language } = useTranslation();
  
  const testKeys = [
    'app.fm',
    'app.souq',
    'app.aqar',
    'app.switchApplication',
    'nav.dashboard',
    'common.brand',
  ];
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Translation Test Page</h1>
      
      <div className="mb-4 p-4 bg-primary/10 rounded">
        <strong>Current Language:</strong> {language}
      </div>
      
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold mb-4">Translation Keys Test:</h2>
        
        {testKeys.map((key) => (
          <div key={key} className="p-4 border rounded">
            <div className="font-mono text-sm text-gray-600 mb-2">
              Key: <code className="bg-gray-200 px-2 py-1 rounded">{key}</code>
            </div>
            <div className="text-lg font-semibold">
              Translation: <span className="text-primary">{t(key, '❌ MISSING')}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-warning/10 rounded">
        <h3 className="font-bold mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>If you see "❌ MISSING", the translation key doesn't exist</li>
          <li>If you see the English/Arabic text, the translation is working</li>
          <li>Try switching language using the TopBar language selector</li>
        </ol>
      </div>
    </div>
  );
}
