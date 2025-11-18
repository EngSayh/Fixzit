import { readFileSync } from 'fs';
import path from 'path';

import { RouteAliasMetrics } from '@/lib/routes/aliasMetrics';
import { postRouteMetricsWebhook } from '@/lib/routes/webhooks';

async function main() {
  const artifactPath = path.join(process.cwd(), '_artifacts/route-aliases.json');
  const contents = readFileSync(artifactPath, 'utf8');
  const metrics = JSON.parse(contents) as RouteAliasMetrics;

  const duplicationRate =
    metrics.totals.aliasFiles > 0
      ? (metrics.totals.duplicateAliases / metrics.totals.aliasFiles) * 100
      : 0;

  await postRouteMetricsWebhook({
    duplicationRate,
    generatedAt: metrics.generatedAt,
    aliasFiles: metrics.totals.aliasFiles,
  });
}

void main();
