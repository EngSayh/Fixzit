"use client";

/**
 * Superadmin Billing & Plans
 * Manage subscription plans and billing
 * 
 * @module app/superadmin/billing/page
 */

import { CreditCard } from "lucide-react";
import { PlannedFeature } from "@/components/superadmin/PlannedFeature";

export default function SuperadminBillingPage() {
  return (
    <PlannedFeature
      title="Billing & Plans"
      description="Manage subscription plans and billing operations"
      icon={<CreditCard className="h-6 w-6" />}
      status="in-development"
      plannedRelease="Q1 2026"
      features={[
        "Subscription plan management",
        "Invoice generation and history",
        "Payment gateway integration (TAP, Stripe)",
        "Usage-based billing metrics",
        "Trial period management",
      ]}
    />
  );
}
