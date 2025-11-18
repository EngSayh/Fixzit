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

const data = JSON.parse(readFileSync(INPUT, 'utf8'));

const modulesMap = new Map<string, { module: string; aliases: number; missing: number; targets: string[] }>();
const reuseMap = new Map<string, number>();

for (const result of data.results) {
  const module = result.alias.split('/')[2] || 'unknown';
  if (!modulesMap.has(module)) {
    modulesMap.set(module, { module, aliases: 0, missing: 0, targets: [] });
  }
  const mod = modulesMap.get(module)!;
  mod.aliases += 1;
  mod.missing += result.exists ? 0 : 1;
  mod.targets.push(result.target);

  reuseMap.set(result.target, (reuseMap.get(result.target) ?? 0) + 1);
}

const modules = Array.from(modulesMap.values()).map((mod) => ({
  module: mod.module,
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
  uniqueTargets: new Set(data.results.map((r: any) => r.target)).size,
  duplicateAliases: reuse.reduce((sum, entry) => sum + entry.count, 0),
  unresolvedAliases: data.results.filter((r: any) => !r.exists).length,
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
