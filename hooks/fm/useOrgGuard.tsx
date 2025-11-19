'use client';

import { useMemo } from 'react';
import { OrgContextPrompt } from '@/components/fm/OrgContextPrompt';
import { useSupportOrg } from '@/contexts/SupportOrgContext';
import { useTranslation } from '@/contexts/TranslationContext';

export function useOrgGuard() {
  const { t } = useTranslation();
  const { effectiveOrgId, canImpersonate, supportOrg, loading } = useSupportOrg();

  const guard = useMemo(
    () => <OrgContextPrompt canImpersonate={canImpersonate} />,
    [canImpersonate]
  );

  const supportBanner = useMemo(() => {
    if (!supportOrg) {
      return null;
    }
    return (
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        {t('fm.org.supportContext', 'Support context: {{name}}', { name: supportOrg.name })}
      </div>
    );
  }, [supportOrg, t]);

  return {
    orgId: effectiveOrgId,
    guard,
    supportBanner,
    canImpersonate,
    supportOrg,
    loading,
  };
}
