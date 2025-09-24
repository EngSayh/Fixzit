#!/usr/bin/env node
// scripts/ingest-knowledge.ts - Auto-learn system changes by scanning docs and code

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import fetch from 'node-fetch';

const INGEST_ENDPOINT = process.env.INGEST_ENDPOINT || 'http://localhost:3000/api/ai/ingest';
const INGEST_KEY = process.env.INGEST_KEY || 'super-secret-ingest-key';
const ORG_ID = process.env.ORG_ID || 'fixzit-platform';

interface Document {
  id: string;
  orgId: string;
  source: string;
  text: string;
  metadata: {
    type: 'documentation' | 'code' | 'api' | 'ui';
    module?: string;
    language?: string;
  };
}

async function scanDocumentation(baseDir: string): Promise<Document[]> {
  const docs: Document[] = [];
  const files = await glob(`${baseDir}/**/*.{md,mdx}`, { ignore: ['**/node_modules/**'] });

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const relativePath = path.relative(process.cwd(), file);
    
    // Extract module from path
    const module = extractModule(relativePath);
    
    docs.push({
      id: `doc-${Buffer.from(relativePath).toString('base64')}`,
      orgId: ORG_ID,
      source: relativePath,
      text: content,
      metadata: {
        type: 'documentation',
        module,
        language: detectLanguage(content)
      }
    });
  }

  return docs;
}

async function scanCode(baseDir: string): Promise<Document[]> {
  const docs: Document[] = [];
  const files = await glob(`${baseDir}/**/*.{ts,tsx,js,jsx}`, { 
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'] 
  });

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const relativePath = path.relative(process.cwd(), file);
    
    // Extract meaningful comments and function descriptions
    const extracted = extractCodeKnowledge(content);
    if (extracted.length === 0) continue;
    
    const module = extractModule(relativePath);
    
    docs.push({
      id: `code-${Buffer.from(relativePath).toString('base64')}`,
      orgId: ORG_ID,
      source: relativePath,
      text: extracted,
      metadata: {
        type: 'code',
        module,
        language: 'typescript'
      }
    });
  }

  return docs;
}

async function scanAPIRoutes(baseDir: string): Promise<Document[]> {
  const docs: Document[] = [];
  const files = await glob(`${baseDir}/app/api/**/*.{ts,js}`, { 
    ignore: ['**/node_modules/**'] 
  });

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const relativePath = path.relative(process.cwd(), file);
    
    // Extract API documentation
    const apiDoc = extractAPIDocumentation(content, relativePath);
    if (!apiDoc) continue;
    
    docs.push({
      id: `api-${Buffer.from(relativePath).toString('base64')}`,
      orgId: ORG_ID,
      source: relativePath,
      text: apiDoc,
      metadata: {
        type: 'api',
        module: extractModule(relativePath)
      }
    });
  }

  return docs;
}

function extractModule(filePath: string): string {
  // Extract module from file path
  if (filePath.includes('work-orders')) return 'work_orders';
  if (filePath.includes('properties')) return 'properties';
  if (filePath.includes('finance')) return 'finance';
  if (filePath.includes('hr')) return 'hr';
  if (filePath.includes('marketplace')) return 'marketplace';
  if (filePath.includes('support')) return 'support';
  if (filePath.includes('compliance')) return 'compliance';
  if (filePath.includes('reports')) return 'reports';
  if (filePath.includes('system')) return 'system';
  if (filePath.includes('crm')) return 'crm';
  return 'dashboard';
}

function detectLanguage(content: string): string {
  // Simple language detection based on content
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(content) ? 'ar' : 'en';
}

function extractCodeKnowledge(content: string): string {
  const knowledge: string[] = [];
  
  // Extract JSDoc comments
  const jsdocPattern = /\/\*\*[\s\S]*?\*\//g;
  const jsdocs = content.match(jsdocPattern) || [];
  knowledge.push(...jsdocs.map(doc => doc.replace(/[*\/]/g, '').trim()));
  
  // Extract component descriptions
  const componentPattern = /export\s+(?:default\s+)?function\s+(\w+)/g;
  const components = [...content.matchAll(componentPattern)];
  components.forEach(([, name]) => {
    knowledge.push(`Component: ${name}`);
  });
  
  // Extract route handlers
  const routePattern = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/g;
  const routes = [...content.matchAll(routePattern)];
  routes.forEach(([, method]) => {
    knowledge.push(`API Route: ${method}`);
  });
  
  return knowledge.join('\n\n');
}

function extractAPIDocumentation(content: string, filePath: string): string | null {
  const docs: string[] = [];
  
  // Extract route from file path
  const route = filePath
    .replace(/.*\/app\/api/, '')
    .replace(/\/route\.(ts|js)$/, '')
    .replace(/\[([^\]]+)\]/g, ':$1');
  
  docs.push(`API Endpoint: ${route}`);
  
  // Extract HTTP methods
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  const foundMethods = methods.filter(method => 
    content.includes(`export async function ${method}`)
  );
  
  if (foundMethods.length > 0) {
    docs.push(`Methods: ${foundMethods.join(', ')}`);
  }
  
  // Extract JSDoc if present
  const jsdocPattern = /\/\*\*[\s\S]*?\*\//;
  const jsdoc = content.match(jsdocPattern);
  if (jsdoc) {
    docs.push(jsdoc[0].replace(/[*\/]/g, '').trim());
  }
  
  return docs.length > 1 ? docs.join('\n\n') : null;
}

async function ingestDocuments(documents: Document[]) {
  if (documents.length === 0) {
    console.log('No documents to ingest');
    return;
  }

  console.log(`Ingesting ${documents.length} documents...`);
  
  try {
    const response = await fetch(INGEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ingest-key': INGEST_KEY
      },
      body: JSON.stringify({ docs: documents })
    });

    if (!response.ok) {
      throw new Error(`Ingest failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Ingest result:', result);
  } catch (error) {
    console.error('Failed to ingest documents:', error);
    throw error;
  }
}

async function main() {
  console.log('🔍 Scanning for knowledge base content...');
  
  const paths = process.argv.slice(2);
  const basePaths = paths.length > 0 ? paths : ['./docs', './app', './src'];
  
  const allDocs: Document[] = [];
  
  for (const basePath of basePaths) {
    console.log(`\nScanning ${basePath}...`);
    
    // Scan documentation
    const docs = await scanDocumentation(basePath);
    console.log(`  Found ${docs.length} documentation files`);
    allDocs.push(...docs);
    
    // Scan code
    const codeDocs = await scanCode(basePath);
    console.log(`  Found ${codeDocs.length} code files with knowledge`);
    allDocs.push(...codeDocs);
    
    // Scan API routes
    if (basePath === './app' || basePath === '.') {
      const apiDocs = await scanAPIRoutes(basePath);
      console.log(`  Found ${apiDocs.length} API routes`);
      allDocs.push(...apiDocs);
    }
  }
  
  console.log(`\n📚 Total documents to ingest: ${allDocs.length}`);
  
  // Ingest in batches
  const batchSize = 50;
  for (let i = 0; i < allDocs.length; i += batchSize) {
    const batch = allDocs.slice(i, i + batchSize);
    console.log(`\nIngesting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allDocs.length / batchSize)}...`);
    await ingestDocuments(batch);
  }
  
  console.log('\n✅ Knowledge base ingestion complete!');
}

// Watch mode
if (process.argv.includes('--watch')) {
  console.log('👁️  Watch mode enabled. Monitoring for changes...');
  
  const chokidar = require('chokidar');
  const watcher = chokidar.watch(['./docs', './app', './src'], {
    ignored: /node_modules|\.next|dist/,
    persistent: true
  });
  
  watcher.on('change', async (path: string) => {
    console.log(`\n📝 File changed: ${path}`);
    await main();
  });
} else {
  main().catch(console.error);
}
