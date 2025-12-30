"use client";

/**
 * Superadmin System Settings - Branding
 * Configure platform-wide branding (logo, colors, name)
 * 
 * @module app/superadmin/system/page
 */

import { useI18n } from "@/i18n/useI18n";
import { Palette } from "@/components/ui/icons";
import { BrandingSettingsForm } from "@/components/superadmin/settings/BrandingSettingsForm";

export default function SuperadminSystemPage() {
  const { t: _t } = useI18n();

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Palette className="h-8 w-8 text-[var(--color-sparkline-blue)]" />
          <h1 className="text-3xl font-bold text-foreground">
            Platform Branding
          </h1>
        </div>
        <p className="text-muted-foreground">
          Configure global branding including logo, colors, and platform name
        </p>
      </div>

      <BrandingSettingsForm />
    </div>
  );
}
