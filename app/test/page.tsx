'use client';

import { useTranslation } from '@/contexts/TranslationContext';

export default function TestPage() {
  const { t } = useTranslation();

  return (
    <div className="p-6 space-y-2">
      <h1 className="text-2xl font-bold">
        {t('test.page.title', 'Test Page')}
      </h1>
      <p className="text-muted-foreground">
        {t('test.page.description', 'This is a simple test page.')}
      </p>
    </div>
  );
}
