"use client";

/**
 * Superadmin Vendor Administration
 * Manage all marketplace vendors, approvals, and vendor settings
 * 
 * @module app/superadmin/vendors/page
 */

import { Store } from "lucide-react";
import { PlannedFeature } from "@/components/superadmin/PlannedFeature";

export default function SuperadminVendorsPage() {
  return (
    <PlannedFeature
      title="Vendor Administration"
      description="Manage all marketplace vendors, approvals, and vendor settings"
      icon={<Store className="h-6 w-6" />}
      status="planned"
      plannedRelease="Q2 2026"
      features={[
        "Vendor onboarding and approval workflow",
        "Performance monitoring and scorecards",
        "Commission and payout management",
        "Vendor suspension and compliance tools",
        "Vendor communication and support portal",
      ]}
    />
  );
}
