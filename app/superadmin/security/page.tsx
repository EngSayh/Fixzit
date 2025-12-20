"use client";

/**
 * Superadmin Security Center
 * Security monitoring and configuration
 * 
 * @module app/superadmin/security/page
 */

import { Shield } from "lucide-react";
import { PlannedFeature } from "@/components/superadmin/PlannedFeature";

export default function SuperadminSecurityPage() {
  return (
    <PlannedFeature
      title="Security Center"
      description="Security monitoring and configuration"
      icon={<Shield className="h-6 w-6" />}
      status="in-development"
      plannedRelease="Q1 2026"
      features={[
        "Real-time threat detection and alerts",
        "Security audit logs and compliance reports",
        "IP allowlists and access controls",
        "Two-factor authentication management",
        "Vulnerability scanning and patch tracking",
      ]}
    />
  );
}
