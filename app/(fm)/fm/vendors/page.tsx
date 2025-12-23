/**
 * FM Vendors Page
 * [AGENT-001-A] Migration to centralized table components per UI_UX_ENHANCEMENT_BLUEPRINT_V1.md
 *
 * Migrated from 460-line inline implementation to centralized FmVendorsList component.
 * Benefits:
 * - Single source of truth for vendor list UI
 * - Consistent styling with other FM module pages
 * - Uses DataTableStandard for standardized table behavior
 * - Reusable across embedded contexts
 */
"use client";

import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { FmGuardedPage } from "@/components/fm/FmGuardedPage";
import { FmVendorsList } from "@/components/fm/vendors";

export default function FMVendorsPage() {
  return (
    <FmGuardedPage moduleId="vendors">
      {({ orgId, supportBanner }) => (
        <div className="space-y-6">
          <ModuleViewTabs moduleId="vendors" />
          <FmVendorsList orgId={orgId} supportBanner={supportBanner} />
        </div>
      )}
    </FmGuardedPage>
  );
}
