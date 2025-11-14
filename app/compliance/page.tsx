'use client';

import { useTranslation } from '@/contexts/TranslationContext';

export default function Page() {
  const { t } = useTranslation();
  
  return <div className="space-y-2">
    <h1 className="text-2xl font-bold">{t('compliance.title', 'Compliance & Legal')}</h1>
    <p>{t('compliance.description', 'Coming online – policies, inspections, contracts, audit logs.')}</p>
  </div>;
}
