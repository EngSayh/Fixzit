import { expect, test } from '@playwright/test';
import { assertNoConsoleErrors } from '../helpers/console';

const forbiddenTokens = [
  'FM Command',
  'Today · Portfolio overview',
  '124 active work orders',
  '18 overdue',
  '91% occupied',
  'SAR 1.4M',
  'مركز تحكم FM',
  '124 أمر عمل',
  '18 متأخر',
  '91٪ مشغولة',
  '1.4 مليون ريال',
];

const riskPatterns = [
  { reason: 'work-order counts', regex: /\b\d{1,4}\s+(?:active|open|overdue)?\s*work\s*orders?\b/i },
  { reason: 'overdue counts', regex: /\b\d{1,4}\s+overdue\b/i },
  { reason: 'occupancy percentage', regex: /\b\d{1,3}\s*%\s*(?:occupied|occupancy|utilization)\b/i },
  { reason: 'currency (SAR/region)', regex: /\b(?:sar|usd|aed|qar|bhd|omr|eur|gbp)\s?\d[\d,.]*/i },
  { reason: 'currency symbol', regex: /[$€£]\s?\d[\d,.]*/ },
  { reason: 'large comma-separated number', regex: /\b\d{1,3}(?:,\d{3})+\b/ },
];

test.describe('Landing page data hygiene', () => {
  test('does not expose FM metrics on public landing', async ({ page }) => {
    test.skip(test.info().project.name === 'Microsoft Edge', 'Edge channel not installed locally');

    await assertNoConsoleErrors(page, async () => {
      await page.goto('/');
      const body = page.locator('body');
      await expect(body).toBeVisible();

      for (const token of forbiddenTokens) {
        await expect(body).not.toContainText(token, { timeout: 1000 });
      }

      const normalizedBody = ((await page.innerText('body')) || '').replace(/\s+/g, ' ').trim();
      const patternHits = riskPatterns
        .map(({ reason, regex }) => ({ reason, match: normalizedBody.match(regex)?.[0] }))
        .filter(({ match }) => Boolean(match));

      expect.soft(patternHits).toEqual([]);

      const highlightTexts = (await page.locator('section.fxz-hero span.rounded-full').allTextContents())
        .map((t) => t.replace(/\s+/g, ' ').trim())
        .filter(Boolean);

      const normalizedHighlights = highlightTexts.join(' | ') || '<empty>';
      expect(normalizedHighlights).toBe('Rapid RFQ | Work Order linked orders | Finance ready invoices');
    });
  });
});
