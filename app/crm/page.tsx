'use client';

import { useTranslation } from '@/contexts/TranslationContext';

export default function Page() {
  const { t } = useTranslation();
  
  return <div className="space-y-2">
    <h1 className="text-2xl font-bold">{t('crm.title', 'CRM')}</h1>
    <p>{t('crm.description', 'Coming online – UI wired, API scaffolded.')}</p>
  </div>;
}
