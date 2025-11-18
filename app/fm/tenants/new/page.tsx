'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CardGridSkeleton } from '@/components/skeletons';
import { useTranslation } from '@/contexts/TranslationContext';
import { CreateTenantForm } from '@/components/fm/tenants/CreateTenantForm';

export default function NewTenantPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;

  if (!session) {
    return <CardGridSkeleton count={4} />;
  }

  if (!orgId) {
    return (
      <div className="p-6 text-destructive">
        {t('fm.errors.noOrgSession', 'Error: No organization ID found in session')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('fm.tenants.new.kicker', 'Tenants · Onboarding workspace')}
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            {t('fm.tenants.new.title', 'Onboard a new tenant')}
          </h1>
          <p className="text-muted-foreground">
            {t(
              'fm.tenants.new.subtitle',
              'Register contact, lease, and compliance data before assigning units or invoices.'
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push('/fm/tenants')}>
            <ArrowLeft className="w-4 h-4 me-2" />
            {t('fm.tenants.new.back', 'Back to tenants')}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('fm.tenants.new.sectionTitle', 'Tenant profile')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t(
              'fm.tenants.new.sectionDescription',
              'Data entered here automatically updates leasing, billing, and support workstreams.'
            )}
          </p>
        </CardHeader>
        <CardContent>
          <CreateTenantForm
            orgId={orgId}
            onCreated={() => {
              router.push('/fm/tenants');
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
