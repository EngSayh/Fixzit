'use client';

import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

export default function CRMPage() {
  const auto = useAutoTranslator('fm.crm');
  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="crm" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {auto('CRM', 'header.title')}
          </h1>
          <p className="text-muted-foreground">
            {auto('Customer relationship management', 'header.subtitle')}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-md border border-border p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {auto('Customer Management', 'card.title')}
        </h2>
        <p className="text-muted-foreground mb-4">
          {auto('CRM interface loads here.', 'card.description')}
        </p>
        <p className="text-sm text-muted-foreground">
          {auto('Connected to CRM API endpoints.', 'card.footer')}
        </p>
      </div>
    </div>
  );
}
