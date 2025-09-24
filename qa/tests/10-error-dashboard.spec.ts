import { test, expect } from '@playwright/test';

/**
 * Testing library and framework:
 * - Framework: Playwright Test (@playwright/test)
 * - Style: E2E UI tests under qa/tests/*.spec.ts
 *
 * Scope: Error Dashboard page/component functionality as per diff.
 *
 * General assumptions:
 * - The dashboard is reachable at /errors or /dashboard/errors.
 * - API endpoint used by the component: /api/errors/aggregate?timeRange=...&module=...&severity=...
 * - We'll mock network responses using Playwright route interception.
 * - We verify loading state, success rendering, filters behavior, refresh action, color badges, empty state, and error handling path.
 */

// Util to resolve likely route. Tries /errors first, then /dashboard/errors.

async function gotoErrorDashboard(page) {
  const candidates = ['/errors', '/dashboard/errors', '/app/errors'];
  for (const path of candidates) {
    const resp = await page.goto(path, { waitUntil: 'domcontentloaded' }).catch(() => null);
    // Heuristic: if any network succeeds and page has "Error Dashboard" header, we keep it.
    if (resp) {
      const hasHeader = await page.locator('h1:text("Error Dashboard")').first().count();
      if (hasHeader > 0) return;
    }
  }
  // Try final candidate and let assertions fail with clearer context
  await page.goto('/errors', { waitUntil: 'domcontentloaded' }).catch(() => {});
}

const baseSummary = {
  totalErrors: 42,
  uniqueIncidentCount: 7,
  severityBreakdown: { CRITICAL: 3, ERROR: 10, WARN: 20, INFO: 9 },
  moduleBreakdown: { System: 10, 'Work Orders': 8 }
};

const baseAggregated = [
  {
    errorCode: 'SYS-DB-500',
    module: 'System',
    category: 'Database',
    count: 12,
    firstOccurrence: '2024-01-01T00:00:00.000Z',
    lastOccurrence: '2024-01-02T12:00:00.000Z',
    severity: 'ERROR',
    userFacing: false,
    autoTicket: true,
    uniqueUserCount: 5,
    uniqueOrgCount: 2
  },
  {
    errorCode: 'WO-NET-408',
    module: 'Work Orders',
    category: 'Network',
    count: 5,
    firstOccurrence: '2024-01-03T00:00:00.000Z',
    lastOccurrence: '2024-01-03T10:00:00.000Z',
    severity: 'WARN',
    userFacing: true,
    autoTicket: false,
    uniqueUserCount: 3,
    uniqueOrgCount: 1
  },
  {
    errorCode: 'SYS-CRIT-001',
    module: 'System',
    category: 'Runtime',
    count: 2,
    firstOccurrence: '2024-01-04T00:00:00.000Z',
    lastOccurrence: '2024-01-04T01:00:00.000Z',
    severity: 'CRITICAL',
    userFacing: true,
    autoTicket: true,
    uniqueUserCount: 2,
    uniqueOrgCount: 1
  }
];

function buildApiMatcher(timeRange?: string, module?: string, severity?: string) {
  // Return a predicate function to avoid constructing a RegExp from variable input.
  // The predicate handles both Route and Request objects that Playwright may pass.
  return (routeOrReq) => {
    let urlStr = '';
    if (!routeOrReq) return false;

    if (typeof routeOrReq === 'string') {
      urlStr = routeOrReq;
    } else if (typeof routeOrReq.url === 'function') {
      // Request object
      try {
        urlStr = routeOrReq.url();
      } catch {
        return false;
      }
    } else if (typeof routeOrReq.request === 'function') {
      // Route object
      try {
        urlStr = routeOrReq.request().url();
      } catch {
        return false;
      }
    } else if (typeof routeOrReq === 'object' && typeof (routeOrReq as any).url === 'string') {
      urlStr = (routeOrReq as any).url;
    } else {
      return false;
    }

    try {
      const u = new URL(urlStr, 'http://localhost');
      if (u.pathname !== '/api/errors/aggregate') return false;
      if (timeRange && u.searchParams.get('timeRange') !== timeRange) return false;
      if (module && u.searchParams.get('module') !== module) return false;
      if (severity && u.searchParams.get('severity') !== severity) return false;
      return true;
    } catch {
      return false;
    }
  };
}

test.describe('Error Dashboard - happy paths', () => {
  test('renders loading state, then summary and table with data', async ({ page }) => {
    // Intercept API: respond after a short delay to allow loading UI to show
    await page.route(/^\/api\/errors\/aggregate.*/, async route => {
      await page.waitForTimeout(50);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ summary: baseSummary, aggregatedErrors: baseAggregated })
      });
    });

    await gotoErrorDashboard(page);

    // Loading state visible
    await expect(page.getByText('Loading error data...')).toBeVisible();

    // After data load, header and summary cards visible
    await expect(page.getByRole('heading', { name: 'Error Dashboard' })).toBeVisible();
    await expect(page.getByText('Total Errors')).toBeVisible();
    await expect(page.getByText(String(baseSummary.totalErrors))).toBeVisible();
    await expect(page.getByText('Unique Incidents')).toBeVisible();
    await expect(page.getByText(String(baseSummary.uniqueIncidentCount))).toBeVisible();
    await expect(page.getByText('Critical Errors')).toBeVisible();
    await expect(page.getByText(String(baseSummary.severityBreakdown.CRITICAL))).toBeVisible();
    await expect(page.getByText('Error Rate')).toBeVisible();
    const expectedRate = Math.round((baseSummary.uniqueIncidentCount / baseSummary.totalErrors) * 100);

    await expect(page.getByText(`${expectedRate}%`)).toBeVisible();

    // Table rows with error codes and attributes
    for (const row of baseAggregated) {
      await expect(page.locator('code', { hasText: row.errorCode })).toBeVisible();
      await expect(page.getByText(row.module).first()).toBeVisible();
      await expect(page.getByText(row.category).first()).toBeVisible();
      await expect(page.getByText(String(row.count)).first()).toBeVisible();
      await expect(page.getByText(row.severity).first()).toBeVisible();
      await expect(page.getByText(`${row.uniqueUserCount} users`).first()).toBeVisible();
    }

    // Actions existence
    await expect(page.getByRole('button', { name: 'View Details' }).first()).toBeVisible();
    // Only rows with autoTicket should show "View Tickets"
    await expect(page.getByRole('button', { name: 'View Tickets' })).toBeVisible();
  });

  test('applies time range, module and severity filters and re-fetches data', async ({ page }) => {
    // Route logic: assert expected query params then return different payloads
    await page.route(buildApiMatcher('24h'), route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ summary: baseSummary, aggregatedErrors: baseAggregated })
      })
    );
    await page.route(buildApiMatcher('7d', 'System', 'ERROR'), route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: { ...baseSummary, totalErrors: 5, uniqueIncidentCount: 2, severityBreakdown: { ERROR: 5 } },
          aggregatedErrors: baseAggregated.filter(e => e.module === 'System' && e.severity === 'ERROR')
        })
      })
    );

    await gotoErrorDashboard(page);

    // Change filters
    await page.getByLabel('Time Range').selectOption('7d');
    await page.getByLabel('Module').selectOption('System');
    await page.getByLabel('Severity').selectOption('ERROR');

    // Expect filtered data to be visible
    await expect(page.getByText('Total Errors')).toBeVisible();
    await expect(page.getByText('5')).toBeVisible(); // new total
    // Only system ERROR rows remain
    await expect(page.locator('code', { hasText: 'SYS-DB-500' })).toBeVisible();
    await expect(page.locator('code', { hasText: 'WO-NET-408' })).toHaveCount(0);
  });

  test('manual Refresh triggers a re-fetch with current filters', async ({ page }) => {
    // First load for default "24h"
    await page.route(buildApiMatcher('24h'), route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ summary: baseSummary, aggregatedErrors: baseAggregated })
      })
    );
    // After changing severity to INFO and clicking refresh
    await page.route(buildApiMatcher('24h', undefined, 'INFO'), route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: { ...baseSummary, totalErrors: 1, uniqueIncidentCount: 1, severityBreakdown: { INFO: 1 } },
          aggregatedErrors: [
            {
              ...baseAggregated[0],
              errorCode: 'SYS-INFO-200',
              severity: 'INFO',
              count: 1
            }
          ]
        })
      })
    );

    await gotoErrorDashboard(page);

    await page.getByLabel('Severity').selectOption('INFO');
    await page.getByRole('button', { name: 'Refresh' }).click();

    await expect(page.locator('code', { hasText: 'SYS-INFO-200' })).toBeVisible();
    await expect(page.getByText('1')).toBeVisible();
    await expect(page.getByText('Info')).toBeVisible();
  });
});

test.describe('Error Dashboard - UI semantics and color badges', () => {
  test('severity and module badges have expected tailwind classes', async ({ page }) => {
    await page.route(/^\/api\/errors\/aggregate.*/, route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ summary: baseSummary, aggregatedErrors: baseAggregated })
      })
    );

    await gotoErrorDashboard(page);

    // Severity classes mapping
    const severityToClasses: Record<string, RegExp> = {
      CRITICAL: /bg-red-100.*text-red-800/,
      ERROR: /bg-orange-100.*text-orange-800/,
      WARN: /bg-yellow-100.*text-yellow-800/,
      INFO: /bg-blue-100.*text-blue-800/
    };

    for (const row of baseAggregated) {
      const sevCell = page.getByText(row.severity).first();
      await expect(sevCell).toBeVisible();
      const cls = await sevCell.evaluate(e => e.closest('span')?.getAttribute('class') || '');
      expect(cls).toMatch(severityToClasses[row.severity] ?? /bg-gray-100.*text-gray-800/);
    }

    // Module classes mapping
    const moduleToClasses: Record<string, RegExp> = {
      'Work Orders': /bg-blue-100.*text-blue-800/,
      Finance: /bg-green-100.*text-green-800/,
      Properties: /bg-purple-100.*text-purple-800/,
      System: /bg-red-100.*text-red-800/,
      Support: /bg-yellow-100.*text-yellow-800/,
      Marketplace: /bg-indigo-100.*text-indigo-800/
    };

    for (const row of baseAggregated) {
      const modCell = page.getByText(row.module).first();
      await expect(modCell).toBeVisible();
      const cls = await modCell.evaluate(e => e.closest('span')?.getAttribute('class') || '');
      expect(cls).toMatch(moduleToClasses[row.module] ?? /bg-gray-100.*text-gray-800/);
    }
  });
});

test.describe('Error Dashboard - empty state and error handling', () => {
  test('shows empty state when no errors are returned', async ({ page }) => {
    await page.route(/^\/api\/errors\/aggregate.*/, route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: { totalErrors: 0, uniqueIncidentCount: 0, severityBreakdown: {}, moduleBreakdown: {} },
          aggregatedErrors: []
        })
      })
    );

    await gotoErrorDashboard(page);

    await expect(page.getByText('No errors found')).toBeVisible();
    await expect(page.getByText('Great\\! No errors were detected for the selected criteria.')).toBeVisible();
  });

  test('on fetch failure, loading stops and UI remains usable (simulating ErrorContext.reportError side-effect)', async ({ page }) => {
    // First call fails
    await page.route(/^\/api\/errors\/aggregate.*/, route =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({}) })
    );

    await gotoErrorDashboard(page);

    // Loading disappears; header remains (component catches and proceeds)
    await expect(page.getByText('Loading error data...')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Error Dashboard' })).toBeVisible();

    // User can click Refresh; make subsequent call succeed
    await page.unroute(/^\/api\/errors\/aggregate.*/);
    await page.route(/^\/api\/errors\/aggregate.*/, route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ summary: baseSummary, aggregatedErrors: baseAggregated })
      })
    );

    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect(page.locator('code', { hasText: 'SYS-DB-500' })).toBeVisible();
  });
});