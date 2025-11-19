'use client';

import Link from 'next/link';
import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import { ShieldCheck, ClipboardCheck, FileText } from 'lucide-react';

export default function CompliancePage() {
  const { hasOrgContext, guard, supportBanner } = useFmOrgGuard({ moduleId: 'compliance' });
  const auto = useAutoTranslator('fm.compliance');
  if (!hasOrgContext) {
    return guard;
  }
  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="compliance" />
      {supportBanner}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {auto('Compliance', 'header.title')}
          </h1>
          <p className="text-muted-foreground">
            {auto('Regulatory compliance and legal management', 'header.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">
                {auto('Audit programs', 'card.audits.title')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {auto('See every regulatory or ISO audit in progress.', 'card.audits.subtitle')}
              </p>
            </div>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <ClipboardCheck className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {auto('Live data sourced from /api/compliance/audits', 'card.audits.dataSource')}
              </p>
            </div>
            <Button asChild>
              <Link href="/fm/compliance/audits">{auto('Open', 'card.audits.open')}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">
                {auto('Policy library', 'card.policies.title')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {auto('Track policy versions, owners, and review cadence.', 'card.policies.subtitle')}
              </p>
            </div>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <FileText className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {auto('Backed by /api/compliance/policies', 'card.policies.dataSource')}
              </p>
            </div>
            <Button asChild>
              <Link href="/fm/compliance/policies">{auto('Browse', 'card.policies.open')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card rounded-2xl shadow-md border border-border">
        <CardHeader className="flex flex-col gap-2 text-center">
          <div className="mx-auto rounded-full bg-primary/10 p-3 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle>{auto('Compliance Dashboard', 'card.title')}</CardTitle>
          <p className="text-muted-foreground">
            {auto('Compliance interface loads here.', 'card.description')}
          </p>
          <p className="text-sm text-muted-foreground">
            {auto('Connected to Compliance API endpoints.', 'card.footer')}
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}
