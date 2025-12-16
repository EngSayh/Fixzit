"use client";

/**
 * Superadmin Jobs & Queues Monitor
 * Monitor background jobs and queue health
 * 
 * @module app/superadmin/jobs/page
 */

import { useI18n } from "@/i18n/useI18n";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperadminJobsPage() {
  const { t } = useI18n();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          {t("superadmin.nav.jobs")}
        </h1>
        <p className="text-slate-400">
          Monitor background jobs and queue health
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Activity className="h-5 w-5" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">
            Jobs & Queues monitor interface will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
