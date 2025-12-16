"use client";

/**
 * Superadmin Roles & Permissions
 * Configure RBAC system-wide
 * 
 * @module app/superadmin/roles/page
 */

import { useI18n } from "@/i18n/useI18n";
import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperadminRolesPage() {
  const { t } = useI18n();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          {t("superadmin.nav.roles")}
        </h1>
        <p className="text-slate-400">
          Configure RBAC system-wide
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">
            Roles & Permissions management interface will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
