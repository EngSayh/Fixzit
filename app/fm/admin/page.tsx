"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from '@/contexts/TranslationContext';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';

/**
 * Admin route canonical redirect
 * Redirects /admin to /administration for consistency
 * See: Stabilization audit - canonicalize admin routes
 */
export default function Page() {
  const router = useRouter();
  const { t } = useTranslation();
  const { hasOrgContext, guard, orgId } = useFmOrgGuard({ moduleId: 'administration' });
  
  useEffect(() => {
    if (hasOrgContext && orgId) {
      router.replace('/administration');
    }
  }, [router, orgId, hasOrgContext]);

  if (!hasOrgContext || !orgId) {
    return <div className="p-6">{guard}</div>;
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">{t('admin.redirecting', 'Redirecting to administration...')}</p>
    </div>
  );
}
