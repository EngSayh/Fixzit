'use client';

import ClaimReviewPanel from '@/components/admin/claims/ClaimReviewPanel';
import { Shield } from 'lucide-react';
import { useI18n } from '@/i18n/useI18n';

export default function AdminClaimsPage() {
  const { t } = useI18n();
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Shield className="w-8 h-8" />
        <div>
          <h1 className="text-3xl font-bold">
            {t('marketplace.claims.admin.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('marketplace.claims.admin.subtitle')}
          </p>
        </div>
      </div>

      {/* Review Panel */}
      <ClaimReviewPanel />
    </div>
  );
}
