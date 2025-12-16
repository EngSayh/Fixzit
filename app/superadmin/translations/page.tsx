"use client";

/**
 * Superadmin Translations Management
 * Manage i18n translations system-wide
 * 
 * @module app/superadmin/translations/page
 */

import { useI18n } from "@/i18n/useI18n";
import { Languages } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperadminTranslationsPage() {
  const { t } = useI18n();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          {t("superadmin.nav.translations")}
        </h1>
        <p className="text-slate-400">
          Manage i18n translations system-wide
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Languages className="h-5 w-5" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">
            Translations management interface will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
