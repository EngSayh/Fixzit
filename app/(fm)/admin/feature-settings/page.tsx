"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { Loader2, RefreshCw, Search, Shield } from "@/components/ui/icons";
import { FeatureToggle, FeatureToggleGroup } from "@/components/ui/feature-toggle";
import { FeatureToggleGroupSkeleton } from "@/components/ui/feature-toggle-skeleton";
import { UpgradeModal } from "@/components/admin/UpgradeModal";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import toast from "react-hot-toast";
import { logger } from "@/lib/logger";
import type { FeatureCategory, FeatureFlag } from "@/lib/feature-flags";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FeatureFlagResponse extends FeatureFlag {
  enabled: boolean;
}

const CATEGORY_ORDER: FeatureCategory[] = [
  "core",
  "ui",
  "finance",
  "hr",
  "aqar",
  "fm",
  "souq",
  "integrations",
  "experimental",
];

const CATEGORY_DETAILS: Record<FeatureCategory, { titleKey: string; descriptionKey: string; fallback: string; descriptionFallback: string }>
  = {
    core: {
      titleKey: "admin.featureFlags.categories.core.title",
      descriptionKey: "admin.featureFlags.categories.core.description",
      fallback: "Core Platform",
      descriptionFallback: "Authentication, localization, and notifications",
    },
    ui: {
      titleKey: "admin.featureFlags.categories.ui.title",
      descriptionKey: "admin.featureFlags.categories.ui.description",
      fallback: "UI & Experience",
      descriptionFallback: "Dashboards, layout options, and visual features",
    },
    finance: {
      titleKey: "admin.featureFlags.categories.finance.title",
      descriptionKey: "admin.featureFlags.categories.finance.description",
      fallback: "Finance",
      descriptionFallback: "Billing, invoicing, and accounting toggles",
    },
    hr: {
      titleKey: "admin.featureFlags.categories.hr.title",
      descriptionKey: "admin.featureFlags.categories.hr.description",
      fallback: "HR & People",
      descriptionFallback: "Employee experience and policy controls",
    },
    aqar: {
      titleKey: "admin.featureFlags.categories.aqar.title",
      descriptionKey: "admin.featureFlags.categories.aqar.description",
      fallback: "Property",
      descriptionFallback: "Aqar and property management surface area",
    },
    fm: {
      titleKey: "admin.featureFlags.categories.fm.title",
      descriptionKey: "admin.featureFlags.categories.fm.description",
      fallback: "FM",
      descriptionFallback: "Facility management flows and automations",
    },
    souq: {
      titleKey: "admin.featureFlags.categories.souq.title",
      descriptionKey: "admin.featureFlags.categories.souq.description",
      fallback: "Souq",
      descriptionFallback: "Marketplace and commerce capabilities",
    },
    integrations: {
      titleKey: "admin.featureFlags.categories.integrations.title",
      descriptionKey: "admin.featureFlags.categories.integrations.description",
      fallback: "Integrations",
      descriptionFallback: "External systems and API bridges",
    },
    experimental: {
      titleKey: "admin.featureFlags.categories.experimental.title",
      descriptionKey: "admin.featureFlags.categories.experimental.description",
      fallback: "Experimental",
      descriptionFallback: "Beta features and staged rollouts",
    },
  };

export default function FeatureSettingsPage() {
  const auto = useAutoTranslator("admin.featureSettings");
  const { data: session, status } = useSession();

  const [flags, setFlags] = useState<FeatureFlagResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFlags, setLoadingFlags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [lockedFeatureName, setLockedFeatureName] = useState("");
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const hasAccess = session?.user?.role === "SUPER_ADMIN";

  const refreshFlags = useCallback(async () => {
    if (!hasAccess) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/feature-flags", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        const message = data?.error || auto("Failed to load feature flags", "errors.load");
        throw new Error(message);
      }

      if (!data || !Array.isArray(data.flags)) {
        throw new Error(auto("Invalid feature flag payload", "errors.invalidPayload"));
      }

      setFlags(data.flags);
      setLastUpdated(data.evaluatedAt ?? new Date().toISOString());
      setError(null);
    } catch (err) {
      logger.error("[FeatureFlags] load failed", err);
      const message =
        err instanceof Error
          ? err.message
          : auto("Unable to load feature flags", "errors.load");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [auto, hasAccess]);

  useEffect(() => {
    if (status === "authenticated" && hasAccess) {
      void refreshFlags();
    }
  }, [status, hasAccess, refreshFlags]);

  const filteredFlags = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return flags;
    return flags.filter((flag) => {
      return (
        flag.id.toLowerCase().includes(term) ||
        flag.name.toLowerCase().includes(term) ||
        flag.description.toLowerCase().includes(term)
      );
    });
  }, [flags, search]);

  const groupedFlags = useMemo(() => {
    const base: Record<FeatureCategory, FeatureFlagResponse[]> = CATEGORY_ORDER.reduce(
      (acc, category) => {
        acc[category] = [];
        return acc;
      },
      {} as Record<FeatureCategory, FeatureFlagResponse[]>,
    );
    filteredFlags.forEach((flag) => {
      base[flag.category]?.push(flag);
    });
    return base;
  }, [filteredFlags]);

  const summary = useMemo(() => {
    const enabled = flags.filter((flag) => flag.enabled).length;
    const rollout = flags.filter((flag) => flag.rolloutPercentage !== undefined).length;
    const restricted = flags.filter((flag) => (flag.allowedOrgs?.length ?? 0) > 0).length;
    return { total: flags.length, enabled, rollout, restricted };
  }, [flags]);

  const handleLockedFeatureClick = (featureName: string) => {
    setLockedFeatureName(featureName);
    setUpgradeModalOpen(true);
  };

  const handleFeatureChange = useCallback(
    async (flagId: string, enabled: boolean) => {
      const previousValue = flags.find((flag) => flag.id === flagId)?.enabled ?? false;

      // Optimistic update
      setFlags((prev) =>
        prev.map((flag) => (flag.id === flagId ? { ...flag, enabled } : flag)),
      );
      setLoadingFlags((prev) => [...prev, flagId]);

      try {
        const response = await fetch("/api/admin/feature-flags", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: flagId, enabled }),
        });
        const data = await response.json();

        if (!response.ok) {
          const message = data?.error || response.statusText;
          throw new Error(message);
        }

        const updated = data?.flag as FeatureFlagResponse | undefined;
        if (updated) {
          setFlags((prev) =>
            prev.map((flag) => (flag.id === flagId ? { ...flag, ...updated } : flag)),
          );
        }

        if (Array.isArray(data?.unmetDependencies) && data.unmetDependencies.length > 0) {
          toast(
            auto(
              "Dependencies are disabled: {{deps}}",
              "featureFlags.dependenciesWarning",
              {
                deps: data.unmetDependencies.join(", "),
              },
            ),
            { icon: "⚠️" },
          );
        }

        toast.success(
          auto(
            "Updated {{flag}}",
            "featureFlags.updated",
            { flag: updated?.name ?? flagId },
          ),
        );
      } catch (err) {
        logger.error("[FeatureFlags] update failed", err);
        setFlags((prev) =>
          prev.map((flag) =>
            flag.id === flagId ? { ...flag, enabled: previousValue } : flag,
          ),
        );
        const message =
          err instanceof Error
            ? err.message
            : auto("Failed to update feature", "featureFlags.updateFailed");
        toast.error(message);
      } finally {
        setLoadingFlags((prev) => prev.filter((id) => id !== flagId));
      }
    },
    [auto, flags],
  );

  if (status === "loading") {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div>
          <div className="h-8 bg-muted rounded w-1/3 mb-2 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
        </div>
        <FeatureToggleGroupSkeleton />
        <FeatureToggleGroupSkeleton />
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-warning/10 border border-warning/20 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-warning mt-0.5" />
            <div>
              <h3 className="text-lg font-medium text-warning-foreground">
                {auto("Authentication Required", "authRequired.title")}
              </h3>
              <p className="mt-2 text-sm text-warning">
                {auto(
                  "You must be logged in to access Feature Settings.",
                  "authRequired.description",
                )}
              </p>
              <a
                href="/login"
                className="mt-4 inline-block px-4 py-2 bg-warning text-white rounded hover:bg-warning/90"
              >
                {auto("Go to Login", "authRequired.cta")}
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-destructive mt-0.5" />
            <div>
              <h3 className="text-lg font-medium text-destructive-foreground">
                {auto("Access Denied", "accessDenied.title")}
              </h3>
              <p className="mt-2 text-sm text-destructive">
                {auto(
                  "You do not have permission to access Feature Settings. This page is restricted to Super Admin users only.",
                  "accessDenied.description",
                )}
              </p>
              <p className="mt-2 text-sm text-destructive">
                {auto("Your role", "accessDenied.roleLabel")}: {session.user?.role}
              </p>
              <a
                href="/dashboard"
                className="mt-4 inline-block px-4 py-2 bg-destructive text-white rounded hover:bg-destructive/90"
              >
                {auto("Return to Dashboard", "accessDenied.cta")}
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">
            {auto("Feature Flags", "admin.features.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "Toggle platform capabilities and guardrails across modules.",
              "admin.featureFlags.subtitle",
            )}
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              {auto(
                "Evaluated at {{time}}",
                "admin.featureFlags.lastUpdated",
                {
                  time: new Date(lastUpdated).toLocaleString(),
                },
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute start-3 top-3 text-muted-foreground" />
            <Input
              className="ps-10 w-64"
              placeholder={auto("Search by name or key", "admin.featureFlags.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => refreshFlags()}
            disabled={loading}
            className="flex items-center gap-2"
            aria-label={auto("Refresh feature flags", "admin.featureFlags.refreshAria")}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {auto("Refresh", "admin.featureFlags.refresh")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 text-destructive-foreground">
          <div className="flex items-start gap-2">
            <Shield className="h-5 w-5 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                {auto("Error loading feature flags", "featureFlags.error")}
              </p>
              <p className="text-sm">{error}</p>
              <button type="button"
                onClick={() => refreshFlags()}
                className="text-sm font-medium underline"
                aria-label={auto("Retry loading feature flags", "errors.retryAria")}
              >
                {auto("Retry", "errors.retry")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {auto("Total Flags", "featureFlags.summary.total")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.total}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {auto("Enabled", "featureFlags.summary.enabled")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-success">
            {summary.enabled}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {auto("Rollout", "featureFlags.summary.rollout")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {summary.rollout}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {auto("Org Scoped", "featureFlags.summary.restricted")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {summary.restricted}
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <>
          <FeatureToggleGroupSkeleton />
          <FeatureToggleGroupSkeleton />
        </>
      ) : (
        CATEGORY_ORDER.map((category) => {
          const flagsForCategory = groupedFlags[category];
          if (!flagsForCategory || flagsForCategory.length === 0) return null;
          const copy = CATEGORY_DETAILS[category];

          return (
            <FeatureToggleGroup
              key={category}
              title={auto(copy.titleKey, copy.fallback)}
              description={auto(copy.descriptionKey, copy.descriptionFallback)}
            >
              {flagsForCategory.map((flag) => {
                const rolloutBadge =
                  flag.rolloutPercentage !== undefined
                    ? auto(
                        "{{percent}}% rollout",
                        "featureFlags.badges.rollout",
                        { percent: flag.rolloutPercentage },
                      )
                    : undefined;

                const orgRestricted =
                  (flag.allowedOrgs?.length ?? 0) > 0 &&
                  (!session.user?.orgId ||
                    !flag.allowedOrgs?.includes(session.user.orgId));

                const locked = orgRestricted;

                const chips: string[] = [];
                if (flag.defaultEnabled) {
                  chips.push(auto("Default on", "featureFlags.badges.defaultOn"));
                }
                if (flag.environmentOverrides?.production === false) {
                  chips.push(auto("Production off", "featureFlags.badges.prodOff"));
                }
                if (flag.environmentOverrides?.staging === true) {
                  chips.push(auto("Staging on", "featureFlags.badges.stagingOn"));
                }
                if (flag.environmentOverrides?.development === true) {
                  chips.push(auto("Dev enabled", "featureFlags.badges.devOn"));
                }
                if (orgRestricted) {
                  chips.push(auto("Org restricted", "featureFlags.badges.orgRestricted"));
                }

                return (
                  <div key={flag.id} className="px-2 py-1">
                    <FeatureToggle
                      id={flag.id}
                      label={flag.name}
                      description={flag.description}
                      enabled={flag.enabled}
                      onChange={(next) => handleFeatureChange(flag.id, next)}
                      loading={loadingFlags.includes(flag.id)}
                      badge={rolloutBadge}
                      locked={locked}
                      onLockedClick={() => handleLockedFeatureClick(flag.name)}
                    />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground ms-4">
                      {chips.map((chip) => (
                        <Badge key={`${flag.id}-${chip}`} variant="outline">
                          {chip}
                        </Badge>
                      ))}
                      {flag.dependencies?.length ? (
                        <span>
                          {auto(
                            "Depends on: {{deps}}",
                            "featureFlags.meta.dependencies",
                            { deps: flag.dependencies.join(", ") },
                          )}
                        </span>
                      ) : null}
                      {flag.allowedOrgs?.length ? (
                        <span>
                          {auto(
                            "Allowed orgs: {{count}}",
                            "featureFlags.meta.allowedOrgs",
                            { count: flag.allowedOrgs.length },
                          )}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </FeatureToggleGroup>
          );
        })
      )}

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        featureName={lockedFeatureName}
      />
    </div>
  );
}
