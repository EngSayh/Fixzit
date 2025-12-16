"use client";

/**
 * Superadmin Analytics Dashboard
 * System-wide analytics and metrics
 * 
 * @module app/superadmin/analytics/page
 */

import { useI18n } from "@/i18n/useI18n";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperadminAnalyticsPage() {
  const { t } = useI18n();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          {t("superadmin.nav.analytics")}
        </h1>
        <p className="text-slate-400">
          System-wide analytics and metrics
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BarChart3 className="h-5 w-5" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">
            Analytics dashboard will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
