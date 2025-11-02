#!/usr/bin/env zx
// @ts-check

/**
 * API Endpoint Scan
 * Audits REST API surface and route patterns
 */

import 'zx/globals';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'reports');

console.log(chalk.blue('🌐 Scanning API Endpoints...'));

async function scanAPI() {
  try {
    // Find all API route files
    const apiDir = path.join(ROOT, 'app', 'api');
    const files = await globby(['**/route.{ts,js}'], { cwd: apiDir });

    const endpoints = [];

    for (const file of files) {
      const filePath = path.join(apiDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Extract HTTP methods
      const methods = [];
      if (/export\s+async\s+function\s+GET/i.test(content)) methods.push('GET');
      if (/export\s+async\s+function\s+POST/i.test(content)) methods.push('POST');
      if (/export\s+async\s+function\s+PUT/i.test(content)) methods.push('PUT');
      if (/export\s+async\s+function\s+PATCH/i.test(content)) methods.push('PATCH');
      if (/export\s+async\s+function\s+DELETE/i.test(content)) methods.push('DELETE');

      // Extract route path from file structure
      const routePath = '/api/' + path.dirname(file).replace(/\\/g, '/');

      endpoints.push({
        path: routePath,
        methods,
        file: path.relative(ROOT, filePath),
        dynamic: routePath.includes('['),
      });
    }

    // Write report
    await fs.ensureDir(REPORTS_DIR);
    await fs.writeJSON(path.join(REPORTS_DIR, 'api-endpoint-scan.json'), endpoints, { spaces: 2 });

    console.log(chalk.green(`✅ API scan complete: ${endpoints.length} endpoints`));
    console.log(chalk.gray(`   GET: ${endpoints.filter(e => e.methods.includes('GET')).length}`));
    console.log(chalk.gray(`   POST: ${endpoints.filter(e => e.methods.includes('POST')).length}`));
    console.log(chalk.gray(`   Dynamic: ${endpoints.filter(e => e.dynamic).length}`));
  } catch (error) {
    console.error(chalk.red(`❌ API scan failed: ${error.message}`));
    throw error;
  }
}

scanAPI();
