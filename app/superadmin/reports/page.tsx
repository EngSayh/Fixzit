"use client";

/**
 * Superadmin System-Wide Reports
 * Generate and view cross-tenant reports, analytics, and insights
 * 
 * @module app/superadmin/reports/page
 */

import { BarChart3 } from "lucide-react";
import { PlannedFeature } from "@/components/superadmin/PlannedFeature";

export default function SuperadminReportsPage() {
  return (
    <PlannedFeature
      title="System Reports"
      description="Generate and view cross-tenant reports, analytics, and insights"
      icon={<BarChart3 className="h-6 w-6" />}
      status="planned"
      plannedRelease="Q1 2026"
      features={[
        "Revenue analytics and financial reports",
        "User activity and engagement metrics",
        "Performance and system health reports",
        "Compliance and audit reports",
        "Custom report builder with export options",
      ]}
    />
  );
}
