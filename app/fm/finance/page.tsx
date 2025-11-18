'use client';

import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

export default function FinancePage() {
  const auto = useAutoTranslator('fm.finance');
  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="finance" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {auto('Finance', 'header.title')}
          </h1>
          <p className="text-muted-foreground">
            {auto('Financial management and billing', 'header.subtitle')}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-md border border-border p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {auto('Financial Dashboard', 'card.title')}
        </h2>
        <p className="text-muted-foreground mb-4">
          {auto('Finance management interface loads here.', 'card.description')}
        </p>
        <p className="text-sm text-muted-foreground">
          {auto('Connected to Finance API endpoints.', 'card.footer')}
        </p>
      </div>
    </div>
  );
}
