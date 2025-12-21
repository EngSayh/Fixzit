/**
 * Route Metrics Types
 * Shared type definitions for route metrics dashboard
 */

export type ModuleStat = {
  module: string;
  aliases: number;
  missing: number;
  uniqueTargets: number;
  targets: string[];
};

export type ReuseEntry = {
  target: string;
  count: number;
  aliasFiles: string[];
  modules: string[];
};

export type AliasRecord = {
  module: string;
  aliasFile: string;
  importTarget: string;
  resolvedPath: string | null;
  targetExists: boolean;
};

export type DuplicateHistoryEntry = {
  target: string;
  firstSeen: string;
  lastSeen: string;
  resolvedAt: string | null;
  active: boolean;
};

export type RouteHealthEntry = {
  target: string;
  pageViews: number;
  errorRate: number;
};

export type RouteInsights = {
  duplicateHistory: DuplicateHistoryEntry[];
  averageResolutionDays: number | null;
  routeHealth: RouteHealthEntry[];
};

export type RouteMetrics = {
  generatedAt: string;
  totals: {
    aliasFiles: number;
    modules: number;
    reusedTargets: number;
    uniqueTargets: number;
    duplicateAliases: number;
    unresolvedAliases: number;
  };
  modules: ModuleStat[];
  reuse: ReuseEntry[];
  aliases: AliasRecord[];
  insights?: RouteInsights;
};

export type AliasState = {
  owner: string;
  resolved: boolean;
  updatedAt?: string;
};

export type RouteHistoryChartDatum = {
  timestamp: string;
  label: string;
  fullLabel: string;
  rate: number;
};

export type HighImpactDuplicate = {
  target: string;
  count: number;
  pageViews: number;
  errorRate: number;
  impact: number;
};

export type TopRiskModule = {
  module: string;
  aliases: number;
  missing: number;
  uniqueTargets: number;
  targets: string[];
  duplicateAliases: number;
  riskScore: number;
};

export type RemediationSuggestion = {
  module: string;
  message: string;
};
