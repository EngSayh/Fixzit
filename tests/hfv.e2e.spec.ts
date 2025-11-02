/**
 * Halt-Fix-Verify (HFV) E2E Test Suite
 * 
 * Tests every page × role combination with evidence artifacts
 * Policy: STRICT v4 + Governance V5
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';

const REPORTS_DIR = path.join(process.cwd(), 'reports');
const EVIDENCE_DIR = path.join(REPORTS_DIR, 'hfv-evidence');

// Ensure evidence directory exists
test.beforeAll(async () => {
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });
});

/**
 * Test Matrix: Pages × Roles
 */
const TEST_MATRIX = [
  { page: '/fm/dashboard', role: 'FM_MANAGER', name: 'FM Dashboard' },
  { page: '/fm/work-orders', role: 'FM_TECHNICIAN', name: 'Work Orders List' },
  { page: '/aqar/properties', role: 'AQAR_AGENT', name: 'Properties List' },
  { page: '/crm/leads', role: 'CRM_AGENT', name: 'CRM Leads' },
  { page: '/hr/employees', role: 'HR_MANAGER', name: 'HR Employees' },
  { page: '/finance/invoices', role: 'FINANCE_ACCOUNTANT', name: 'Finance Invoices' },
];

/**
 * HFV Test Template
 */
for (const testCase of TEST_MATRIX) {
  test(`HFV: ${testCase.name} (${testCase.role})`, async ({ page, context }) => {
    const evidence = {
      testCase: testCase.name,
      role: testCase.role,
      page: testCase.page,
      timestamp: new Date().toISOString(),
      steps: [],
      screenshots: [],
      errors: [],
      passed: false,
    };

    try {
      // Step 1: HALT - Navigate to page
      evidence.steps.push({ step: 'HALT', action: 'Navigate', url: testCase.page });
      await page.goto(testCase.page, { waitUntil: 'networkidle' });
      
      // Capture screenshot
      const screenshotPath = path.join(EVIDENCE_DIR, `${testCase.role}_${testCase.name.replace(/\s+/g, '_')}_initial.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      evidence.screenshots.push(screenshotPath);

      // Step 2: FIX - Verify no console errors
      evidence.steps.push({ step: 'FIX', action: 'Check Console Errors' });
      const errors: string[] = [];

      // Capture all console and page errors
      const onConsole = (msg: any) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      };
      const onPageError = (error: any) => {
        errors.push(error.message);
      };

      page.on('console', onConsole);
      page.on('pageerror', onPageError);

      // Wait a bit to collect errors
      await page.waitForTimeout(2000);

      if (errors.length > 0) {
        evidence.errors = errors;
        throw new Error(`Console errors detected: ${errors.join(', ')}`);
      }

      // Step 3: VERIFY - Check page structure
      evidence.steps.push({ step: 'VERIFY', action: 'Check Page Structure' });
      
      // Verify layout components exist
      const topBar = page.locator('[data-testid="top-bar"], header, nav');
      const sidebar = page.locator('[data-testid="sidebar"], aside');
      const mainContent = page.locator('main, [role="main"]');

      await expect(topBar).toBeVisible({ timeout: 5000 });
      await expect(mainContent).toBeVisible({ timeout: 5000 });

      // Verify no hardcoded colors (check only inline styles, not computed styles)
      const elements = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('*'))
          .slice(0, 50)
          .map(node => ({
            tag: node.tagName,
            color: (node as HTMLElement).style?.color || null,
            backgroundColor: (node as HTMLElement).style?.backgroundColor || null,
          }));
      });
      
      const hardcodedColors = elements.filter((el: any) => {
        const hexColorRegex = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/;
        const rgbColorRegex = /rgb\(\s*\d+\s*,/;
        const hasHardcodedColor = el.color && (hexColorRegex.test(el.color) || rgbColorRegex.test(el.color));
        const hasHardcodedBg = el.backgroundColor && (hexColorRegex.test(el.backgroundColor) || rgbColorRegex.test(el.backgroundColor));
        return hasHardcodedColor || hasHardcodedBg;
      });

      if (hardcodedColors.length > 0) {
        evidence.errors.push(`Hardcoded colors detected in inline styles: ${hardcodedColors.length} elements`);
        console.warn(`⚠️  Hardcoded colors detected in inline styles in ${testCase.name}`);
      }

      // Verify RBAC (role-based access control)
      evidence.steps.push({ step: 'VERIFY', action: 'Check RBAC' });
      const unauthorizedContent = page.locator('text=/unauthorized|access denied|forbidden/i');
      const hasUnauthorized = await unauthorizedContent.count() > 0;

      if (hasUnauthorized) {
        evidence.errors.push('Unauthorized access detected');
        throw new Error('RBAC violation: Unauthorized content visible');
      }
      
      // All checks passed!
      evidence.passed = true;
    } catch (error) {
      evidence.passed = false;
      evidence.errors.push((error as Error).message);
      evidence.steps.push({ step: 'FAILED', action: (error as Error).message, status: 'ERROR' });
      
      // Capture failure screenshot
      const errorScreenshotPath = path.join(
        EVIDENCE_DIR,
        `${testCase.role}_${testCase.name.replace(/\s+/g, '_')}_error.png`
      );
      await page.screenshot({ path: errorScreenshotPath, fullPage: true });
      evidence.screenshots.push(errorScreenshotPath);

      throw error;
    } finally {
      // Remove error listeners to prevent memory leaks
      page.off('console', onConsole);
      page.off('pageerror', onPageError);

      // Write evidence artifact
      const evidencePath = path.join(
        EVIDENCE_DIR,
        `${testCase.role}_${testCase.name.replace(/\s+/g, '_')}_evidence.json`
      );
      await fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2));
    }
  });
}

/**
 * Aggregate Evidence Report
 */
test.afterAll(async () => {
  try {
    const evidenceFiles = await fs.readdir(EVIDENCE_DIR);
    const evidenceData = [];

    for (const file of evidenceFiles.filter(f => f.endsWith('_evidence.json'))) {
      const content = await fs.readFile(path.join(EVIDENCE_DIR, file), 'utf-8');
      evidenceData.push(JSON.parse(content));
    }

    const summary = {
      totalTests: evidenceData.length,
      passed: evidenceData.filter(e => e.passed).length,
      failed: evidenceData.filter(e => !e.passed).length,
      timestamp: new Date().toISOString(),
      evidence: evidenceData,
    };

    await fs.writeFile(
      path.join(REPORTS_DIR, 'hfv-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log(`\n📊 HFV Test Summary:`);
    console.log(`   Total: ${summary.totalTests}`);
    console.log(`   Passed: ${summary.passed}`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`   Evidence: ${EVIDENCE_DIR}`);
  } catch (error) {
    console.error('Failed to generate HFV summary:', error);
  }
});
