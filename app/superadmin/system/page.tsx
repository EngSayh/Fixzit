"use client";

/**
 * Superadmin System Settings
 * Configure global system parameters
 * 
 * @module app/superadmin/system/page
 */

import { useI18n } from "@/i18n/useI18n";
import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperadminSystemPage() {
  const { t } = useI18n();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          {t("superadmin.nav.system")}
        </h1>
        <p className="text-slate-400">
          Configure global system parameters
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Settings className="h-5 w-5" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">
            System settings interface will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
