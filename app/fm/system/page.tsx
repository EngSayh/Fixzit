"use client";

import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

export default function SystemPage() {
  const { hasOrgContext, guard, supportBanner } = useFmOrgGuard({
    moduleId: "system",
  });
  const auto = useAutoTranslator("fm.system");
  if (!hasOrgContext) {
    return guard;
  }

  return (
    <div className="p-6 space-y-6">
      {supportBanner}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {auto("System Management", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "Configure system settings and preferences",
              "header.subtitle",
            )}
          </p>
        </div>
      </div>
      <ModuleViewTabs moduleId="system" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl shadow-md border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {auto("General Settings", "general.title")}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {auto("Organization Name", "general.organizationName")}
              </label>
              <input
                type="text"
                value="Fixzit Enterprise"
                className="w-full px-3 py-2 border border-border rounded-2xl"
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {auto("Default Language", "general.defaultLanguage")}
              </label>
              <select className="w-full px-3 py-2 border border-border rounded-2xl">
                <option>{auto("English", "general.languages.en")}</option>
                <option>{auto("Arabic", "general.languages.ar")}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-md border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {auto("System Info", "info.title")}
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                {auto("Version", "info.version")}
              </span>
              <span className="text-sm font-medium text-foreground">
                2.0.26
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                {auto("Last Update", "info.lastUpdate")}
              </span>
              <span className="text-sm font-medium text-foreground">
                Jan 12, 2025
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                {auto("Database Status", "info.databaseStatus")}
              </span>
              <span className="text-sm font-medium text-success">
                {auto("Connected", "info.connected")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
