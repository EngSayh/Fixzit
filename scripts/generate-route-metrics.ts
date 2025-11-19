#!/usr/bin/env tsx
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const INPUT = path.join(ROOT, '_artifacts', 'route-alias-report.json');
const OUTPUT = path.join(ROOT, 'public', 'api-mock', 'route-metrics.json');

if (!existsSync(INPUT)) {
  console.error('Route alias report not found. Run "pnpm run check:route-aliases" first.');
  process.exit(1);
}

type RouteAliasResult = {
  alias: string;
  target: string;
  exists: boolean;
};

type RouteAliasReport = {
  results: RouteAliasResult[];
};

const data = JSON.parse(readFileSync(INPUT, 'utf8')) as RouteAliasReport;

const modulesMap = new Map<string, { moduleKey: string; aliases: number; missing: number; targets: string[] }>();
const reuseMap = new Map<string, number>();

for (const result of data.results) {
  const moduleKey = result.alias.split('/')[2] || 'unknown';
  if (!modulesMap.has(moduleKey)) {
    modulesMap.set(moduleKey, { moduleKey, aliases: 0, missing: 0, targets: [] });
  }
  const mod = modulesMap.get(moduleKey)!;
  mod.aliases += 1;
  mod.missing += result.exists ? 0 : 1;
  mod.targets.push(result.target);

  reuseMap.set(result.target, (reuseMap.get(result.target) ?? 0) + 1);
}

const modules = Array.from(modulesMap.values()).map((mod) => ({
  module: mod.moduleKey,
  aliases: mod.aliases,
  missing: mod.missing,
  uniqueTargets: new Set(mod.targets).size,
  targets: mod.targets,
}));

const reuse = Array.from(reuseMap.entries())
  .filter(([, count]) => count > 1)
  .map(([target, count]) => ({ target, count }))
  .sort((a, b) => b.count - a.count);

const totals = {
  aliasFiles: data.results.length,
  modules: modules.length,
  reusedTargets: reuse.length,
  uniqueTargets: new Set(data.results.map((r) => r.target)).size,
  duplicateAliases: reuse.reduce((sum, entry) => sum + entry.count, 0),
  unresolvedAliases: data.results.filter((r) => !r.exists).length,
};

const payload = {
  generatedAt: new Date().toISOString(),
  totals,
  modules,
  reuse,
};

mkdirSync(path.dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(payload, null, 2));
console.log(`Route metrics saved to ${OUTPUT}`);
