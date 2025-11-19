import fg from 'fast-glob';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

export type AliasRecord = {
  module: string;
  aliasFile: string;
  importTarget: string;
  resolvedPath: string | null;
  targetExists: boolean;
};

export type ModuleStat = {
  module: string;
  aliases: number;
  missing: number;
  uniqueTargets: number;
  targets: string[];
};

export type ReuseSummary = {
  target: string;
  count: number;
  aliasFiles: string[];
  modules: string[];
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

export type RouteAliasInsights = {
  duplicateHistory: DuplicateHistoryEntry[];
  averageResolutionDays: number | null;
  routeHealth: RouteHealthEntry[];
};

export type RouteAliasMetrics = {
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
  aliases: AliasRecord[];
  reuse: ReuseSummary[];
  insights?: RouteAliasInsights;
};

const aliasPattern = /export\s+\{\s*default\s*\}\s+from\s+['"]([^'"]+)['"]/;
const suffixes = ['.tsx', '.ts', '.jsx', '.js', '.mdx'];

const projectRoot = process.cwd();
const DUP_HISTORY_ENV = process.env.ROUTE_DUP_HISTORY_PATH;

/**
 * Resolve an import target string such as "@/app/hr/employees/page"
 * to a physical file path (relative to the project root).
 */
function resolveImportTarget(target: string): string | null {
  const withoutAlias = target.startsWith('@/') ? target.slice(2) : target.replace(/^~\//, '');

  const hasExtension = /\.[a-z]+$/i.test(withoutAlias);
  if (hasExtension) {
    const candidate = path.join(projectRoot, withoutAlias);
    return existsSync(candidate) ? path.relative(projectRoot, candidate) : null;
  }

  for (const suffix of suffixes) {
    const candidate = path.join(projectRoot, withoutAlias + suffix);
    if (existsSync(candidate)) {
      return path.relative(projectRoot, candidate);
    }
  }

  return null;
}

/**
 * Collect every alias file that follows the `export { default } from '...';` pattern
 * within the `/app/fm` subtree (configurable via baseDir).
 */
export function collectAliasRecords(baseDir = 'app/fm'): AliasRecord[] {
  const files = fg.sync(`${baseDir}/**/page.tsx`, { cwd: projectRoot });
  const records: AliasRecord[] = [];

  for (const filePath of files) {
    const contents = readFileSync(path.join(projectRoot, filePath), 'utf8');
    const match = aliasPattern.exec(contents);
    if (!match) continue;

    const moduleName = filePath.split(/[/\\]/)[2] ?? 'unknown';
    const resolvedPath = resolveImportTarget(match[1]);

    records.push({
      module: moduleName,
      aliasFile: filePath,
      importTarget: match[1],
      resolvedPath,
      targetExists: Boolean(resolvedPath),
    });
  }

  return records;
}

export function summarizeModules(records: AliasRecord[]): ModuleStat[] {
  type ModuleEntry = {
    aliases: number;
    missing: number;
    targets: Set<string>;
  };

  const stats = new Map<string, ModuleEntry>();

  for (const record of records) {
    const key = record.module;
    if (!stats.has(key)) {
      stats.set(key, { aliases: 0, missing: 0, targets: new Set() });
    }
    const entry = stats.get(key)!;
    entry.aliases += 1;
    if (!record.targetExists) entry.missing += 1;
    entry.targets.add(record.resolvedPath ?? `missing:${record.importTarget}`);
  }

  return Array.from(stats.entries())
    .sort((a, b) => b[1].aliases - a[1].aliases)
    .map(([module, entry]) => ({
      module,
      aliases: entry.aliases,
      missing: entry.missing,
      uniqueTargets: entry.targets.size,
      targets: Array.from(entry.targets).sort(),
    }));
}

export function summarizeReuse(records: AliasRecord[]): ReuseSummary[] {
  const reuse = new Map<
    string,
    {
      count: number;
      aliasFiles: string[];
      modules: Set<string>;
    }
  >();

  for (const record of records) {
    if (!record.resolvedPath) continue;
    if (!reuse.has(record.resolvedPath)) {
      reuse.set(record.resolvedPath, {
        count: 0,
        aliasFiles: [],
        modules: new Set(),
      });
    }
    const entry = reuse.get(record.resolvedPath)!;
    entry.count += 1;
    entry.aliasFiles.push(record.aliasFile);
    entry.modules.add(record.module);
  }

  return Array.from(reuse.entries())
    .filter(([, data]) => data.count > 1)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([target, data]) => ({
      target,
      count: data.count,
      aliasFiles: data.aliasFiles.sort(),
      modules: Array.from(data.modules).sort(),
    }));
}

function countUniqueTargets(records: AliasRecord[]): number {
  const targets = new Set<string>();
  for (const record of records) {
    const key = record.resolvedPath ?? `missing:${record.importTarget}`;
    targets.add(key);
  }
  return targets.size;
}

function countDuplicateAliases(reuse: ReuseSummary[]): number {
  return reuse.reduce((total, entry) => total + (entry.count - 1), 0);
}

function countUnresolved(records: AliasRecord[]): number {
  return records.filter((record) => !record.targetExists).length;
}

export function generateRouteAliasMetrics(baseDir = 'app/fm'): RouteAliasMetrics {
  const records = collectAliasRecords(baseDir);
  const modules = summarizeModules(records);
  const reuse = summarizeReuse(records);
  const uniqueTargets = countUniqueTargets(records);
  const duplicateAliases = countDuplicateAliases(reuse);
  const unresolvedAliases = countUnresolved(records);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      aliasFiles: records.length,
      modules: modules.length,
      reusedTargets: reuse.length,
      uniqueTargets,
      duplicateAliases,
      unresolvedAliases,
    },
    modules,
    aliases: records,
    reuse,
  };
}

export function readRouteAliasMetrics(jsonPath: string): RouteAliasMetrics | null {
  if (!existsSync(jsonPath)) {
    return null;
  }

  try {
    const contents = readFileSync(jsonPath, 'utf8');
    return JSON.parse(contents) as RouteAliasMetrics;
  } catch {
    return null;
  }
}

export function saveRouteAliasMetrics(jsonPath: string, metrics: RouteAliasMetrics) {
  mkdirSync(path.dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(metrics, null, 2));
}

type DuplicateHistoryMap = Record<string, DuplicateHistoryEntry>;

function readDuplicateHistory(): DuplicateHistoryMap {
  const historyPath =
    DUP_HISTORY_ENV || path.join(projectRoot, '_artifacts/route-dup-history.json');
  if (!existsSync(historyPath)) {
    return {};
  }

  try {
    const raw = readFileSync(historyPath, 'utf8');
    return JSON.parse(raw) as DuplicateHistoryMap;
  } catch {
    return {};
  }
}

function saveDuplicateHistory(history: DuplicateHistoryMap) {
  const historyPath =
    DUP_HISTORY_ENV || path.join(projectRoot, '_artifacts/route-dup-history.json');
  writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

function calculateAverageResolutionDays(history: DuplicateHistoryEntry[]): number | null {
  const resolved = history.filter((entry) => !entry.active && entry.resolvedAt);
  if (resolved.length === 0) return null;

  const total = resolved.reduce((acc, entry) => {
    if (!entry.resolvedAt) return acc;
    const first = new Date(entry.firstSeen).getTime();
    const resolvedAt = new Date(entry.resolvedAt).getTime();
    return acc + Math.max(resolvedAt - first, 0);
  }, 0);

  const avgMs = total / resolved.length;
  return Number((avgMs / (1000 * 60 * 60 * 24)).toFixed(2));
}

type EnrichOptions = {
  routeHealth?: RouteHealthEntry[];
};

export function enrichRouteAliasMetrics(
  metrics: RouteAliasMetrics,
  options: EnrichOptions = {}
): RouteAliasMetrics {
  const existingHistory = readDuplicateHistory();
  const updatedHistory: DuplicateHistoryMap = { ...existingHistory };
  const activeTargets = new Set(metrics.reuse.map((entry) => entry.target));
  const now = metrics.generatedAt;

  for (const reuseEntry of metrics.reuse) {
    const current = updatedHistory[reuseEntry.target];
    if (current) {
      updatedHistory[reuseEntry.target] = {
        ...current,
        active: true,
        lastSeen: now,
        resolvedAt: null,
      };
    } else {
      updatedHistory[reuseEntry.target] = {
        target: reuseEntry.target,
        firstSeen: now,
        lastSeen: now,
        resolvedAt: null,
        active: true,
      };
    }
  }

  for (const [target, entry] of Object.entries(updatedHistory)) {
    if (!activeTargets.has(target) && entry.active) {
      updatedHistory[target] = {
        ...entry,
        active: false,
        resolvedAt: entry.resolvedAt ?? now,
        lastSeen: now,
      };
    }
  }

  const historyEntries = Object.values(updatedHistory).sort((a, b) =>
    new Date(a.firstSeen).getTime() - new Date(b.firstSeen).getTime()
  );
  const averageResolutionDays = calculateAverageResolutionDays(historyEntries);

  saveDuplicateHistory(updatedHistory);

  return {
    ...metrics,
    insights: {
      duplicateHistory: historyEntries,
      averageResolutionDays,
      routeHealth: options.routeHealth ?? [],
    },
  };
}
