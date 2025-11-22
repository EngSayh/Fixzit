import path from 'path';
import { mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import {
  generateRouteAliasMetrics,
  saveRouteAliasMetrics,
  RouteAliasMetrics,
  enrichRouteAliasMetrics,
} from '@/lib/routes/aliasMetrics';
import { loadRouteHealthData } from '@/lib/routes/routeHealth';

type CliOptions = {
  jsonPath: string | null;
  history: boolean;
};

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  if (args.includes('--no-json')) {
    return { jsonPath: null, history: !args.includes('--no-history') };
  }

  const jsonFlagIndex = args.indexOf('--json');
  if (jsonFlagIndex !== -1) {
    const customPath = args[jsonFlagIndex + 1];
    if (!customPath) throw new Error('--json flag requires a path argument');
    const absolute = path.isAbsolute(customPath)
      ? customPath
      : path.join(process.cwd(), customPath);
    return { jsonPath: absolute, history: !args.includes('--no-history') };
  }

  return {
    jsonPath: path.join(process.cwd(), '_artifacts/route-aliases.json'),
    history: !args.includes('--no-history'),
  };
}

function logSummary(metrics: RouteAliasMetrics) {
  console.log(`Scanned ${metrics.aliases.length} alias files under app/fm.`);

  if (metrics.aliases.some((alias) => !alias.targetExists)) {
    const missing = metrics.aliases.filter((alias) => !alias.targetExists);
    console.error(`❌ ${missing.length} alias files point to missing targets:`);
    for (const record of missing) {
      console.error(` - ${record.aliasFile} -> ${record.importTarget}`);
    }
    process.exit(1);
  }

  console.log('✅ All alias files resolved to real target files.');

  console.log('\nModule summary:');
  for (const mod of metrics.modules) {
    const targetWord = mod.uniqueTargets === 1 ? 'target' : 'targets';
    console.log(
      ` - ${mod.module}: ${mod.aliases} alias files, ${mod.uniqueTargets} ${targetWord} (${mod.missing} missing)`
    );
  }

  if (metrics.reuse.length > 0) {
    console.log('\nMost reused targets (indicates shared implementations):');
    for (const entry of metrics.reuse.slice(0, 10)) {
      console.log(` - ${entry.target} ← ${entry.count} aliases`);
    }
  }

  if (metrics.insights?.averageResolutionDays !== null) {
    console.log(`\nAvg duplication resolution time: ${metrics.insights.averageResolutionDays} days`);
  }
}

const cliOptions = parseArgs();
const HISTORY_LIMIT = Number(process.env.ROUTE_HISTORY_LIMIT ?? '120');

async function main() {
  const routeHealth = await loadRouteHealthData();
  const metrics = enrichRouteAliasMetrics(generateRouteAliasMetrics(), {
    routeHealth,
  });
  logSummary(metrics);

  if (cliOptions.jsonPath) {
    saveRouteAliasMetrics(cliOptions.jsonPath, metrics);
    console.log(`\nSaved alias audit JSON to ${path.relative(process.cwd(), cliOptions.jsonPath)}`);
  }

  if (cliOptions.history) {
    const historyDir = path.join(process.cwd(), 'reports/route-metrics/history');
    mkdirSync(historyDir, { recursive: true });
    const safeTimestamp = metrics.generatedAt.replace(/[:.]/g, '-');
    const historyPath = path.join(historyDir, `route-aliases-${safeTimestamp}.json`);
    writeFileSync(historyPath, JSON.stringify(metrics, null, 2));
    console.log(`Archived snapshot to ${path.relative(process.cwd(), historyPath)}`);

     const snapshots = readdirSync(historyDir)
       .filter((file) => file.startsWith('route-aliases-') && file.endsWith('.json'))
       .sort();
     while (snapshots.length > HISTORY_LIMIT) {
       const oldest = snapshots.shift();
       if (oldest) {
         unlinkSync(path.join(historyDir, oldest));
       }
     }
  }
}

void main();
