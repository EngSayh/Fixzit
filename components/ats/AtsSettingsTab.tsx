"use client";

import { useAutoTranslator } from "@/i18n/useAutoTranslator";

/**
 * ATS Settings types
 */
export type AtsSettings = {
  scoringWeights?: {
    skills?: number;
    experience?: number;
    culture?: number;
    education?: number;
  };
  knockoutRules?: {
    minYears?: number;
    autoRejectMissingExperience?: boolean;
    autoRejectMissingSkills?: boolean;
    requiredSkills?: string[];
  };
  emailTemplates?: {
    applicationReceived?: string;
    interviewScheduled?: string;
    offerExtended?: string;
    rejection?: string;
  };
};

type AtsSettingsTabProps = {
  settings?: AtsSettings;
  settingsLoading: boolean;
  settingsError?: Error | null;
};

/**
 * ATS Settings Tab Content Component
 * Extracted from recruitment page for maintainability
 */
export function AtsSettingsTab({
  settings,
  settingsLoading,
  settingsError,
}: AtsSettingsTabProps) {
  const auto = useAutoTranslator("ats.settings");

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {auto("Loading settings...", "settings.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (settingsError) {
    return (
      <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-destructive mb-2">
          {auto("Error Loading Settings", "settings.errorTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">{settingsError.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {auto("ATS Settings", "settings.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {auto(
              "Configure screening rules and scoring weights",
              "settings.subtitle"
            )}
          </p>
        </div>
      </div>

      {/* Scoring Weights */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          {auto("Application Scoring Weights", "settings.scoring.title")}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          {auto(
            "Adjust how different factors contribute to candidate scores (must total 100%)",
            "settings.scoring.subtitle"
          )}
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-2">
                {auto("Skills Match ({{percent}}%)", "settings.scoring.skills", {
                  percent: settings?.scoringWeights?.skills
                    ? Math.round(settings.scoringWeights.skills * 100)
                    : 60,
                })}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={
                  settings?.scoringWeights?.skills
                    ? Math.round(settings.scoringWeights.skills * 100)
                    : 60
                }
                className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                disabled
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">
                {auto(
                  "Experience ({{percent}}%)",
                  "settings.scoring.experience",
                  {
                    percent: settings?.scoringWeights?.experience
                      ? Math.round(settings.scoringWeights.experience * 100)
                      : 30,
                  }
                )}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={
                  settings?.scoringWeights?.experience
                    ? Math.round(settings.scoringWeights.experience * 100)
                    : 30
                }
                className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                disabled
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">
                {auto(
                  "Culture Fit ({{percent}}%)",
                  "settings.scoring.culture",
                  {
                    percent: settings?.scoringWeights?.culture
                      ? Math.round(settings.scoringWeights.culture * 100)
                      : 5,
                  }
                )}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={
                  settings?.scoringWeights?.culture
                    ? Math.round(settings.scoringWeights.culture * 100)
                    : 5
                }
                className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                disabled
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">
                {auto(
                  "Education ({{percent}}%)",
                  "settings.scoring.education",
                  {
                    percent: settings?.scoringWeights?.education
                      ? Math.round(settings.scoringWeights.education * 100)
                      : 5,
                  }
                )}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={
                  settings?.scoringWeights?.education
                    ? Math.round(settings.scoringWeights.education * 100)
                    : 5
                }
                className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                disabled
              />
            </div>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Total:</span>{" "}
              {(() => {
                if (!settings?.scoringWeights) return 100;
                const weights = settings.scoringWeights;
                const total =
                  (weights.skills ?? 0) +
                  (weights.experience ?? 0) +
                  (weights.culture ?? 0) +
                  (weights.education ?? 0);
                return Math.round(total * 100);
              })()}
              %
            </p>
          </div>
        </div>
      </div>

      {/* Knockout Rules */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          {auto("Knockout Rules", "settings.knockout.title")}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          {auto(
            "Automatically reject candidates who don't meet minimum requirements",
            "settings.knockout.subtitle"
          )}
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
            <div>
              <div className="font-medium">
                {auto(
                  "Minimum Years of Experience",
                  "settings.knockout.minExperience"
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Current: {settings?.knockoutRules?.minYears || 0} years
              </div>
            </div>
            <div className="text-2xl font-bold text-primary">
              {settings?.knockoutRules?.minYears || 0}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
            <div>
              <div className="font-medium">
                {auto(
                  "Auto-Reject Missing Experience",
                  "settings.knockout.autoRejectExperience"
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Reject if experience field is empty
              </div>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                settings?.knockoutRules?.autoRejectMissingExperience
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {settings?.knockoutRules?.autoRejectMissingExperience
                ? auto("Enabled", "settings.status.enabled")
                : auto("Disabled", "settings.status.disabled")}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
            <div>
              <div className="font-medium">
                {auto(
                  "Auto-Reject Missing Skills",
                  "settings.knockout.autoRejectSkills"
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Reject if required skills are missing
              </div>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                settings?.knockoutRules?.autoRejectMissingSkills
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {settings?.knockoutRules?.autoRejectMissingSkills
                ? auto("Enabled", "settings.status.enabled")
                : auto("Disabled", "settings.status.disabled")}
            </div>
          </div>

          <div className="p-4 bg-accent rounded-lg">
            <div className="font-medium mb-2">
              {auto("Required Skills", "settings.knockout.requiredSkills")}
            </div>
            <div className="flex flex-wrap gap-2">
              {settings?.knockoutRules?.requiredSkills &&
              settings.knockoutRules.requiredSkills.length > 0 ? (
                settings.knockoutRules.requiredSkills.map(
                  (skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  )
                )
              ) : (
                <span className="text-sm text-muted-foreground">
                  {auto(
                    "No required skills configured",
                    "settings.knockout.none"
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Email Templates Placeholder */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          {auto("Email Templates", "settings.email.title")}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {auto(
            "Customize automated email notifications",
            "settings.email.subtitle"
          )}
        </p>
        <div className="space-y-3">
          <div className="p-4 bg-accent rounded-lg flex items-center justify-between">
            <div>
              <div className="font-medium">Application Received</div>
              <div className="text-sm text-muted-foreground">
                Sent when candidate applies
              </div>
            </div>
            <span className="text-sm text-muted-foreground">
              Default template
            </span>
          </div>
          <div className="p-4 bg-accent rounded-lg flex items-center justify-between">
            <div>
              <div className="font-medium">Interview Scheduled</div>
              <div className="text-sm text-muted-foreground">
                Sent when interview is booked
              </div>
            </div>
            <span className="text-sm text-muted-foreground">
              Default template
            </span>
          </div>
          <div className="p-4 bg-accent rounded-lg flex items-center justify-between">
            <div>
              <div className="font-medium">Offer Extended</div>
              <div className="text-sm text-muted-foreground">
                Sent when offer is made
              </div>
            </div>
            <span className="text-sm text-muted-foreground">
              Default template
            </span>
          </div>
        </div>
      </div>

      <div className="bg-primary/5 dark:bg-primary/20/20 border border-primary/20 dark:border-primary/30 rounded-lg p-4">
        <p className="text-sm text-primary-dark dark:text-primary-light">
          <span className="font-medium">Note:</span> Settings editing UI will be
          enabled in Phase 3. Currently displaying read-only configuration.
        </p>
      </div>
    </div>
  );
}
