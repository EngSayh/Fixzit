#!/usr/bin/env npx tsx
/**
 * Issue Log CLI Tool
 * Command-line interface for managing issues
 * 
 * Usage:
 *   pnpm issue-log list [--status=open] [--priority=P0,P1]
 *   pnpm issue-log stats
 *   pnpm issue-log add --title="..." --priority=P1 --file=src/...
 *   pnpm issue-log import --file=issues.json
 *   pnpm issue-log quick-wins
 *   pnpm issue-log stale
 * 
 * @module scripts/issue-log
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// CONSTANTS
// ============================================================================

const API_BASE = process.env.ISSUE_API_URL || 'http://localhost:3000/api/issues';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

const PRIORITY_COLORS: Record<string, string> = {
  P0: COLORS.red,
  P1: COLORS.yellow,
  P2: COLORS.cyan,
  P3: COLORS.gray,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function log(message: string, color = COLORS.reset): void {
  console.log(`${color}${message}${COLORS.reset}`);
}

function logError(message: string): void {
  console.error(`${COLORS.red}Error: ${message}${COLORS.reset}`);
}

function logSuccess(message: string): void {
  log(`✓ ${message}`, COLORS.green);
}

function logInfo(message: string): void {
  log(`ℹ ${message}`, COLORS.blue);
}

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      result[key] = value || 'true';
    }
  }
  
  return result;
}

async function fetchAPI(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE}${endpoint}`;
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add auth token if available
  const authToken = process.env.ISSUE_API_TOKEN;
  if (authToken) {
    defaultHeaders['Authorization'] = `Bearer ${authToken}`;
  }
  
  return fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
}

// ============================================================================
// MARKDOWN PARSING (for PENDING_MASTER.md)
// ============================================================================

interface ParsedIssue {
  legacyId?: string;
  title: string;
  description?: string;
  priority: string;
  category: string;
  effort?: string;
  module?: string;
  location?: { filePath?: string; lineStart?: number };
  status?: string;
  sourceSnippet?: string;
  sourceHash?: string;
  action?: string;
}

function parseMarkdownIssues(content: string, sourceFile: string): ParsedIssue[] {
  const issues: ParsedIssue[] = [];
  const lines = content.split('\n');
  
  // Patterns for different issue formats in PENDING_MASTER.md
  // Format 1: Table row: | ID | Title | Priority | ...
  const tableRowPattern = /^\|\s*([A-Z]+-\d+)\s*\|([^|]+)\|([^|]+)\|/;
  
  // Format 2: List item: - [ ] BUG-001: Title (P1)
  const listItemPattern = /^[-*]\s*\[[ x]\]\s*([A-Z]+-\d+):\s*(.+?)\s*\(([P][0-3])\)/i;
  
  // Format 3: Heading with ID: ### BUG-001: Title
  const headingPattern = /^#{2,4}\s*([A-Z]+-\d+):\s*(.+)/;
  
  // Format 4: Simple bullet: - BUG-001: Title
  const bulletPattern = /^[-*]\s*([A-Z]+-\d+):\s*(.+)/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpMatchArray | null;
    
    // Try table row format
    match = line.match(tableRowPattern);
    if (match) {
      const [, id, titleRaw, priorityRaw] = match;
      const priority = priorityRaw.trim().match(/P[0-3]/)?.[0] || 'P2';
      const title = titleRaw.trim();
      
      if (title && !title.startsWith('---') && !title.toLowerCase().includes('title')) {
        issues.push({
          legacyId: id.trim(),
          title,
          priority,
          category: detectCategory(id),
          sourceSnippet: line.slice(0, 500),
          sourceHash: generateHash(id + title),
        });
      }
      continue;
    }
    
    // Try list item format
    match = line.match(listItemPattern);
    if (match) {
      const [, id, title, priority] = match;
      issues.push({
        legacyId: id.trim(),
        title: title.trim(),
        priority: priority.toUpperCase(),
        category: detectCategory(id),
        status: line.includes('[x]') ? 'closed' : 'open',
        sourceSnippet: line.slice(0, 500),
        sourceHash: generateHash(id + title),
      });
      continue;
    }
    
    // Try heading format
    match = line.match(headingPattern);
    if (match) {
      const [, id, title] = match;
      // Look for description in following lines
      let description = '';
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].trim() && !lines[j].startsWith('#')) {
          description = lines[j].trim();
          break;
        }
      }
      
      issues.push({
        legacyId: id.trim(),
        title: title.trim(),
        priority: detectPriority(line + description),
        category: detectCategory(id),
        description,
        sourceSnippet: line.slice(0, 500),
        sourceHash: generateHash(id + title),
      });
      continue;
    }
    
    // Try simple bullet format
    match = line.match(bulletPattern);
    if (match) {
      const [, id, title] = match;
      issues.push({
        legacyId: id.trim(),
        title: title.trim(),
        priority: detectPriority(line),
        category: detectCategory(id),
        sourceSnippet: line.slice(0, 500),
        sourceHash: generateHash(id + title),
      });
    }
  }
  
  logInfo(`Parsed from: ${sourceFile}`);
  return issues;
}

function detectCategory(id: string): string {
  const prefix = id.split('-')[0].toLowerCase();
  const categoryMap: Record<string, string> = {
    bug: 'bug',
    sec: 'security',
    security: 'security',
    logic: 'logic_error',
    perf: 'efficiency',
    eff: 'efficiency',
    test: 'missing_test',
    doc: 'documentation',
    feat: 'enhancement',
    high: 'enhancement',
  };
  return categoryMap[prefix] || 'bug';
}

function detectPriority(text: string): string {
  if (/P0|critical|urgent|blocker/i.test(text)) return 'P0';
  if (/P1|high|important/i.test(text)) return 'P1';
  if (/P3|low|minor|nice.?to.?have/i.test(text)) return 'P3';
  return 'P2';
}

function generateHash(input: string): string {
  // Simple hash for deduplication
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ============================================================================
// COMMANDS
// ============================================================================

async function listIssues(args: Record<string, string>): Promise<void> {
  const params = new URLSearchParams();
  
  if (args.status) params.set('status', args.status);
  if (args.priority) params.set('priority', args.priority);
  if (args.category) params.set('category', args.category);
  if (args.module) params.set('module', args.module);
  if (args.limit) params.set('limit', args.limit);
  if (args.quickWins) params.set('quickWins', 'true');
  if (args.stale) params.set('stale', 'true');
  
  try {
    const response = await fetchAPI(`?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const issues = data.issues || [];
    
    if (issues.length === 0) {
      logInfo('No issues found matching criteria');
      return;
    }
    
    log(`\n${COLORS.bold}Issues (${issues.length} of ${data.pagination?.total || issues.length})${COLORS.reset}\n`);
    
    // Table header
    console.log(
      `${'ID'.padEnd(8)} ${'Priority'.padEnd(10)} ${'Status'.padEnd(12)} ${'Title'.padEnd(50)} ${'Module'.padEnd(15)}`
    );
    console.log('-'.repeat(100));
    
    for (const issue of issues) {
      const priorityColor = PRIORITY_COLORS[issue.priority] || COLORS.reset;
      const id = issue._id.slice(-6);
      const title = issue.title.length > 48 ? issue.title.slice(0, 45) + '...' : issue.title;
      
      console.log(
        `${id.padEnd(8)} ${priorityColor}${issue.priority.padEnd(10)}${COLORS.reset} ${issue.status.padEnd(12)} ${title.padEnd(50)} ${(issue.module || '-').padEnd(15)}`
      );
    }
    
    log('');
    
  } catch (error) {
    logError(error instanceof Error ? error.message : 'Failed to list issues');
  }
}

async function showStats(): Promise<void> {
  try {
    const response = await fetchAPI('/stats');
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const stats = await response.json();
    
    log(`\n${COLORS.bold}Issue Statistics${COLORS.reset}\n`);
    
    log(`Total Issues:     ${stats.total}`);
    log(`Open:             ${COLORS.yellow}${stats.totalOpen}${COLORS.reset}`);
    log(`Closed:           ${COLORS.green}${stats.totalClosed}${COLORS.reset}`);
    log(`Health Score:     ${stats.healthScore >= 70 ? COLORS.green : stats.healthScore >= 40 ? COLORS.yellow : COLORS.red}${stats.healthScore}%${COLORS.reset}`);
    
    log(`\n${COLORS.bold}By Priority:${COLORS.reset}`);
    for (const [priority, count] of Object.entries(stats.byPriority || {})) {
      const color = PRIORITY_COLORS[priority] || COLORS.reset;
      log(`  ${color}${priority}:${COLORS.reset} ${count}`);
    }
    
    log(`\n${COLORS.bold}Quick Stats:${COLORS.reset}`);
    log(`  Quick Wins:     ${COLORS.green}${stats.quickWins}${COLORS.reset}`);
    log(`  Stale:          ${COLORS.yellow}${stats.stale}${COLORS.reset}`);
    log(`  Blocked:        ${COLORS.red}${stats.blocked}${COLORS.reset}`);
    
    log('');
    
  } catch (error) {
    logError(error instanceof Error ? error.message : 'Failed to fetch stats');
  }
}

async function addIssue(args: Record<string, string>): Promise<void> {
  if (!args.title) {
    logError('--title is required');
    return;
  }
  
  const issue = {
    title: args.title,
    description: args.description || '',
    category: args.category || 'bug',
    priority: args.priority || 'P2',
    effort: args.effort || 'M',
    location: {
      filePath: args.file || '',
      lineStart: args.line ? parseInt(args.line) : undefined,
    },
    module: args.module || '',
    action: args.action || `Fix: ${args.title}`,
    definitionOfDone: args.dod || 'Issue resolved and verified',
    labels: args.labels ? args.labels.split(',') : [],
  };
  
  try {
    const response = await fetchAPI('', {
      method: 'POST',
      body: JSON.stringify(issue),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    logSuccess(`Issue created: ${data.issue._id}`);
    log(`  Title: ${data.issue.title}`);
    log(`  Priority: ${data.issue.priority}`);
    
  } catch (error) {
    logError(error instanceof Error ? error.message : 'Failed to create issue');
  }
}

async function importIssues(args: Record<string, string>): Promise<void> {
  const filePath = args.file;
  
  if (!filePath) {
    logError('--file is required');
    return;
  }
  
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(absolutePath)) {
    logError(`File not found: ${absolutePath}`);
    return;
  }
  
  try {
    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    let issues: unknown[];
    
    // Detect file type and parse accordingly
    const ext = path.extname(absolutePath).toLowerCase();
    
    if (ext === '.md' || ext === '.markdown') {
      // Parse markdown file (PENDING_MASTER.md format)
      issues = parseMarkdownIssues(fileContent, absolutePath);
      logInfo(`Parsed ${issues.length} issues from markdown`);
    } else {
      try {
        issues = JSON.parse(fileContent);
      } catch {
        logError('Invalid JSON file');
        return;
      }
    }
    
    if (!Array.isArray(issues)) {
      issues = [issues];
    }
    
    if (issues.length === 0) {
      logInfo('No issues found in file');
      return;
    }
    
    const response = await fetchAPI('/import', {
      method: 'POST',
      body: JSON.stringify({
        source: 'cli',
        issues,
        options: {
          skipDuplicates: args.skipDuplicates === 'true',
          updateExisting: args.update === 'true',
          dryRun: args.dryRun === 'true',
        },
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.dryRun) {
      logInfo('Dry run - no changes made');
    }
    
    logSuccess(`Import complete:`);
    log(`  Imported: ${data.result.imported}`);
    log(`  Updated:  ${data.result.updated}`);
    log(`  Skipped:  ${data.result.skipped}`);
    
    if (data.result.errors.length > 0) {
      log(`  Errors:   ${COLORS.red}${data.result.errors.length}${COLORS.reset}`);
    }
    
  } catch (error) {
    logError(error instanceof Error ? error.message : 'Failed to import issues');
  }
}

async function showQuickWins(): Promise<void> {
  await listIssues({ quickWins: 'true', limit: '20' });
}

async function showStale(): Promise<void> {
  await listIssues({ stale: 'true', limit: '20' });
}

function showHelp(): void {
  log(`
${COLORS.bold}Issue Log CLI${COLORS.reset}

${COLORS.bold}Usage:${COLORS.reset}
  pnpm issue-log <command> [options]

${COLORS.bold}Commands:${COLORS.reset}
  list          List issues with optional filters
  stats         Show issue statistics
  add           Add a new issue
  import        Import issues from JSON file
  quick-wins    Show quick win issues (low effort, high priority)
  stale         Show stale issues (not updated in 7+ days)
  help          Show this help message

${COLORS.bold}List Options:${COLORS.reset}
  --status=<status>       Filter by status (open, in_progress, blocked, etc.)
  --priority=<priority>   Filter by priority (P0, P1, P2, P3)
  --category=<category>   Filter by category (bug, security, etc.)
  --module=<module>       Filter by module
  --limit=<number>        Limit results (default: 20)

${COLORS.bold}Add Options:${COLORS.reset}
  --title=<title>         Issue title (required)
  --description=<desc>    Issue description
  --priority=<priority>   Priority (P0-P3, default: P2)
  --category=<category>   Category (default: bug)
  --effort=<effort>       Effort estimate (XS, S, M, L, XL)
  --file=<path>           File path
  --line=<number>         Line number
  --module=<module>       Module name
  --labels=<a,b,c>        Comma-separated labels

${COLORS.bold}Import Options:${COLORS.reset}
  --file=<path>           JSON file to import (required)
  --skipDuplicates=true   Skip duplicate issues
  --update=true           Update existing issues
  --dryRun=true           Preview without making changes

${COLORS.bold}Environment Variables:${COLORS.reset}
  ISSUE_API_URL           API base URL (default: http://localhost:3000/api/issues)
  ISSUE_API_TOKEN         Bearer token for authentication
`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = parseArgs(args.slice(1));
  
  switch (command) {
    case 'list':
      await listIssues(options);
      break;
    case 'stats':
      await showStats();
      break;
    case 'add':
      await addIssue(options);
      break;
    case 'import':
      await importIssues(options);
      break;
    case 'quick-wins':
    case 'quickwins':
      await showQuickWins();
      break;
    case 'stale':
      await showStale();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      if (command) {
        logError(`Unknown command: ${command}`);
      }
      showHelp();
  }
}

main().catch((error) => {
  logError(error.message);
  process.exit(1);
});
