"use client";

/**
 * Superadmin Feature Flags
 * Manage feature toggles system-wide
 * 
 * @module app/superadmin/features/page
 */

import { Zap } from "lucide-react";
import { PlannedFeature } from "@/components/superadmin/PlannedFeature";

export default function SuperadminFeaturesPage() {
  return (
    <PlannedFeature
      title="Feature Flags"
      description="Manage feature toggles system-wide"
      icon={<Zap className="h-6 w-6" />}
      status="in-development"
      plannedRelease="Q1 2026"
      features={[
        "Toggle features per tenant or globally",
        "A/B testing and gradual rollouts",
        "Feature flag inheritance and overrides",
        "Scheduled feature activations",
        "Usage analytics and impact tracking",
      ]}
    />
  );
}
