"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from '@/contexts/TranslationContext';

/**
 * Admin route canonical redirect
 * Redirects /admin to /administration for consistency
 * See: Stabilization audit - canonicalize admin routes
 */
export default function Page() {
  const router = useRouter();
  const { t } = useTranslation();
  
  useEffect(() => {
    router.replace('/administration');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">{t('admin.redirecting', 'Redirecting to administration...')}</p>
    </div>
  );
}
