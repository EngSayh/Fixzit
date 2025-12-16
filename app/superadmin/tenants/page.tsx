"use client";

/**
 * Superadmin Tenants/Orgs Management
 * Manage all organizations and tenant accounts
 * 
 * @module app/superadmin/tenants/page
 */

import { useI18n } from "@/i18n/useI18n";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperadminTenantsPage() {
  const { t } = useI18n();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          {t("superadmin.nav.tenants")}
        </h1>
        <p className="text-slate-400">
          Manage all organizations and tenant accounts
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Building2 className="h-5 w-5" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">
            Tenants/Organizations management interface will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
