"use client";

import { useAutoTranslator } from "@/i18n/useAutoTranslator";

/**
 * Analytics data type
 */
export type AnalyticsData = Record<string, unknown>;

type AtsAnalyticsTabProps = {
  analytics: AnalyticsData | null;
  analyticsLoading: boolean;
  analyticsError?: Error | null;
  AnalyticsOverview: React.ComponentType<{ data: AnalyticsData }>;
};

/**
 * ATS Analytics Tab Content Component
 * Extracted from recruitment page for maintainability
 */
export function AtsAnalyticsTab({
  analytics,
  analyticsLoading,
  analyticsError,
  AnalyticsOverview,
}: AtsAnalyticsTabProps) {
  const auto = useAutoTranslator("ats");

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {auto("Loading analytics...", "analytics.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (analyticsError) {
    return (
      <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-destructive mb-2">
          {auto("Error Loading Analytics", "analytics.errorTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {analyticsError.message}
        </p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-card border rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-xl font-semibold mb-2">
          {auto("No Data Yet", "analytics.emptyTitle")}
        </h2>
        <p className="text-muted-foreground">
          {auto(
            "Analytics will appear once you have applications in your pipeline.",
            "analytics.emptySubtitle"
          )}
        </p>
      </div>
    );
  }

  return <AnalyticsOverview data={analytics} />;
}
