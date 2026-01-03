"use client";

/**
 * SuperAdmin Theme Settings Page
 * 
 * Full control over platform color palette.
 * 
 * @module app/superadmin/theme/page
 * @compliance Ejar.sa Design System (Saudi Platforms Code)
 * @agent [AGENT-001-A]
 */

import { Palette, Settings } from "@/components/ui/icons";
import { ThemeSettingsForm } from "@/components/superadmin/settings/ThemeSettingsForm";
import { BrandingSettingsForm } from "@/components/superadmin/settings/BrandingSettingsForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SuperadminThemePage() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Palette className="h-8 w-8 text-[var(--theme-primary,#25935F)]" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Theme & Branding
          </h1>
          <p className="text-muted-foreground">
            Customize the platform appearance and brand identity
          </p>
        </div>
      </div>

      {/* Tabs for Theme vs Branding */}
      <Tabs defaultValue="theme" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="theme" className="gap-2">
            <Palette className="h-4 w-4" />
            Color Theme
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Settings className="h-4 w-4" />
            Branding
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="theme">
            <ThemeSettingsForm />
          </TabsContent>

          <TabsContent value="branding">
            <BrandingSettingsForm />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
