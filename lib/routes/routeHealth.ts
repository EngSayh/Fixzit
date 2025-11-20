import { existsSync, readFileSync } from 'fs';
import path from 'path';

import { RouteHealthEntry } from './aliasMetrics';

const projectRoot = process.cwd();
const ROUTE_HEALTH_ENDPOINT = process.env.ROUTE_HEALTH_ENDPOINT;
const ROUTE_HEALTH_TOKEN = process.env.ROUTE_HEALTH_TOKEN;

async function loadFromFile(
  filePath = path.join(projectRoot, '_artifacts/route-health.json')
): Promise<RouteHealthEntry[]> {
  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const contents = readFileSync(filePath, 'utf8');
    return JSON.parse(contents) as RouteHealthEntry[];
  } catch {
    return [];
  }
}

export async function loadRouteHealthData(): Promise<RouteHealthEntry[]> {
  if (ROUTE_HEALTH_ENDPOINT) {
    try {
      const response = await fetch(ROUTE_HEALTH_ENDPOINT, {
        headers: ROUTE_HEALTH_TOKEN
          ? { Authorization: `Bearer ${ROUTE_HEALTH_TOKEN}` }
          : undefined,
      });

      if (response.ok) {
        const payload = (await response.json()) as RouteHealthEntry[];
        return payload;
      }
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error));
      void error;
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch route health endpoint', error);
      }
    }
  }

  return loadFromFile();
}
