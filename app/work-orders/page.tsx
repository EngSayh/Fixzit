'use client';

import React from 'react';
import { OrgContextPrompt } from '@/components/fm/OrgContextPrompt';
import { WorkOrdersView } from '@/components/fm/WorkOrdersView';
import { useSupportOrg } from '@/contexts/SupportOrgContext';
import { useTranslation } from '@/contexts/TranslationContext';

export default function WorkOrdersPage() {
  const { t } = useTranslation();
  const { effectiveOrgId, canImpersonate, supportOrg } = useSupportOrg();

  if (!effectiveOrgId) {
    return (
      <div className="p-6">
        <OrgContextPrompt canImpersonate={canImpersonate} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t('fm.org.supportContext', 'Support context: {{name}}', { name: supportOrg.name })}
        </div>
      )}
      <WorkOrdersView orgId={effectiveOrgId} />
    </div>
  );
}
