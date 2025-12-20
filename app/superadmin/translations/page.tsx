"use client";

/**
 * Superadmin Translations Management
 * Manage i18n translations system-wide
 * 
 * @module app/superadmin/translations/page
 */

import { Languages } from "lucide-react";
import { PlannedFeature } from "@/components/superadmin/PlannedFeature";

export default function SuperadminTranslationsPage() {
  return (
    <PlannedFeature
      title="Translations"
      description="Manage i18n translations system-wide"
      icon={<Languages className="h-6 w-6" />}
      status="in-development"
      plannedRelease="Q1 2026"
      features={[
        "Visual translation editor with context preview",
        "Missing translation detection and reporting",
        "Machine translation integration (Google, DeepL)",
        "Translation memory and glossary management",
        "Import/export for professional translators",
      ]}
    />
  );
}
