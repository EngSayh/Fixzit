#!/usr/bin/env tsx
/**
 * OpenAPI Stub Generator
 * 
 * Generates OpenAPI 3.0 path stubs for undocumented API routes.
 * Run: npx tsx scripts/generate-openapi-stubs.ts
 * 
 * @module scripts/generate-openapi-stubs
 */

import * as fs from 'fs';
import * as _path from 'path';
import { execSync } from 'child_process';

// Route categories and their tags
const ROUTE_TAGS: Record<string, string> = {
  '/admin': 'Admin',
  '/auth': 'Authentication',
  '/aqar': 'Aqar - Real Estate',
  '/ats': 'ATS - Applicant Tracking',
  '/billing': 'Billing',
  '/checkout': 'Checkout',
  '/cms': 'CMS',
  '/compliance': 'Compliance',
  '/contracts': 'Contracts',
  '/copilot': 'Copilot AI',
  '/counters': 'Counters',
  '/crm': 'CRM',
  '/dev': 'Development',
  '/fm': 'Facilities Management',
  '/health': 'Health Checks',
  '/hr': 'HR',
  '/jobs': 'Background Jobs',
  '/kb': 'Knowledge Base',
  '/marketplace': 'Marketplace',
  '/metrics': 'Metrics',
  '/notifications': 'Notifications',
  '/organization': 'Organization',
  '/owner': 'Owner Portal',
  '/payments': 'Payments',
  '/pm': 'Preventive Maintenance',
  '/properties': 'Properties',
  '/public': 'Public API',
  '/reports': 'Reports',
  '/sellers': 'Sellers',
  '/settings': 'Settings',
  '/souq': 'Souq Marketplace',
  '/sso': 'Single Sign-On',
  '/support': 'Support',
  '/tenant': 'Tenant Portal',
  '/test': 'Testing',
  '/upload': 'File Upload',
  '/users': 'Users',
  '/vendors': 'Vendors',
  '/work-orders': 'Work Orders',
  '/assets': 'Assets',
  '/webhooks': 'Webhooks',
  '/careers': 'Careers',
  '/graphql': 'GraphQL',
  '/feeds': 'Feeds',
};

function getTag(route: string): string {
  for (const [prefix, tag] of Object.entries(ROUTE_TAGS)) {
    if (route.startsWith(prefix)) {
      return tag;
    }
  }
  return 'Other';
}

function getDescription(method: string, route: string): string {
  const resource = route.split('/').filter(Boolean).pop()?.replace(/[{}]/g, '') || 'resource';
  const descriptions: Record<string, string> = {
    GET: `Retrieve ${resource}`,
    POST: `Create ${resource}`,
    PUT: `Update ${resource}`,
    PATCH: `Partially update ${resource}`,
    DELETE: `Delete ${resource}`,
  };
  return descriptions[method] || `${method} ${resource}`;
}

function generatePathStub(route: string, methods: string[]): string {
  const tag = getTag(route);
  const hasPathParam = route.includes('{');
  
  let yaml = `  ${route}:\n`;
  
  for (const method of methods) {
    const methodLower = method.toLowerCase();
    const summary = getDescription(method, route);
    // Escape quotes in summary and tag for valid YAML
    const summaryYaml = summary.replace(/"/g, '\\"');
    const tagYaml = tag.replace(/"/g, '\\"');
    
    yaml += `    ${methodLower}:\n`;
    yaml += `      summary: "${summaryYaml}"\n`;
    yaml += `      tags: ["${tagYaml}"]\n`;
    yaml += `      security:\n`;
    yaml += `        - bearerAuth: []\n`;
    
    // Add path parameters if route has {param}
    if (hasPathParam) {
      const params = route.match(/\{([^}]+)\}/g) || [];
      if (params.length > 0) {
        yaml += `      parameters:\n`;
        for (const param of params) {
          const paramName = param.replace(/[{}]/g, '');
          yaml += `        - name: ${paramName}\n`;
          yaml += `          in: path\n`;
          yaml += `          required: true\n`;
          yaml += `          schema:\n`;
          yaml += `            type: string\n`;
        }
      }
    }
    
    // Add request body for POST, PUT, PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      yaml += `      requestBody:\n`;
      yaml += `        required: true\n`;
      yaml += `        content:\n`;
      yaml += `          application/json:\n`;
      yaml += `            schema:\n`;
      yaml += `              type: object\n`;
    }
    
    yaml += `      responses:\n`;
    
    if (method === 'GET') {
      yaml += `        "200":\n`;
      yaml += `          description: Success\n`;
    } else if (method === 'POST') {
      yaml += `        "201":\n`;
      yaml += `          description: Created\n`;
    } else if (method === 'DELETE') {
      yaml += `        "204":\n`;
      yaml += `          description: Deleted\n`;
    } else {
      yaml += `        "200":\n`;
      yaml += `          description: Success\n`;
    }
    
    yaml += `        "400":\n`;
    yaml += `          $ref: "#/components/responses/BadRequest"\n`;
    yaml += `        "401":\n`;
    yaml += `          $ref: "#/components/responses/Unauthorized"\n`;
  }
  
  return yaml;
}

/**
 * Orchestrates generation of OpenAPI path stubs for undocumented API routes.
 *
 * Scans app/api for route handlers and their exported HTTP methods, compares
 * discovered routes against paths listed in openapi.yaml, and writes YAML stubs
 * for undocumented routes to openapi-stubs.yaml. Prints progress and a
 * categorized summary of undocumented routes.
 */
async function main() {
  console.log('🔍 Scanning API routes...');
  
  // Get all routes with methods
  const routesOutput = execSync(
    `find app/api -name "route.ts" | while read file; do
      route=$(echo "$file" | sed 's|app/api||' | sed 's|/route.ts||' | sed 's|\\[id\\]|{id}|g' | sed -E 's|\\[[^]]+\\]|{param}|g')
      methods=$(grep -oE "^export (async )?function (GET|POST|PUT|PATCH|DELETE)|^export const (GET|POST|PUT|PATCH|DELETE)" "$file" 2>/dev/null | grep -oE "(GET|POST|PUT|PATCH|DELETE)" | tr '\\n' ',' | sed 's/,$//')
      if [ -n "$methods" ]; then
        echo "$route|$methods"
      fi
    done`,
    { encoding: 'utf8', cwd: process.cwd() }
  );
  
  const routes = routesOutput.trim().split('\n').filter(Boolean);
  console.log(`📊 Found ${routes.length} routes with handlers`);
  
  // Read existing OpenAPI to find documented routes
  // Match paths that start with / at 2-space indent (OpenAPI paths format)
  // Pattern: exactly 2 spaces, then /, then path segments until end of identifier
  const existingSpec = fs.readFileSync('openapi.yaml', 'utf8');
  const pathRegex = /^ {2}(\/[a-zA-Z0-9\-_/{}]+):/gm;
  const documentedRoutes = new Set<string>();
  let match;
  while ((match = pathRegex.exec(existingSpec)) !== null) {
    documentedRoutes.add(match[1]);
  }
  console.log(`📝 Currently documented: ${documentedRoutes.size} routes`);
  
  // Find undocumented routes
  const undocumented: Array<{ route: string; methods: string[] }> = [];
  for (const line of routes) {
    const [route, methodsStr] = line.split('|');
    if (!documentedRoutes.has(route)) {
      undocumented.push({ route, methods: methodsStr.split(',') });
    }
  }
  
  console.log(`🆕 Undocumented routes: ${undocumented.length}`);
  
  // Sort routes by path for consistent output
  undocumented.sort((a, b) => a.route.localeCompare(b.route));
  
  // Generate stubs
  let stubs = '\n# === AUTO-GENERATED ROUTE STUBS (2025-12-11) ===\n';
  stubs += '# Generated by scripts/generate-openapi-stubs.ts\n';
  stubs += '# Review and enhance with proper schemas as needed\n\n';
  
  for (const { route, methods } of undocumented) {
    stubs += generatePathStub(route, methods);
    stubs += '\n';
  }
  
  // Write stubs to separate file for review
  fs.writeFileSync('openapi-stubs.yaml', stubs);
  console.log(`✅ Generated stubs saved to openapi-stubs.yaml`);
  console.log(`📋 Run: cat openapi-stubs.yaml >> openapi.yaml (after review)`);
  
  // Summary by tag
  const tagCounts: Record<string, number> = {};
  for (const { route } of undocumented) {
    const tag = getTag(route);
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }
  
  console.log('\n📊 Routes by category:');
  Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => {
      console.log(`   ${tag}: ${count}`);
    });
}

main().catch((err) => {
  console.error('OpenAPI stub generation failed:', err);
  process.exit(1);
});
