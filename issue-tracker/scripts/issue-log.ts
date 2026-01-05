#!/usr/bin/env node
/**
 * Issue Logger CLI
 * Quick way to log issues from VSCode terminal
 * 
 * Usage:
 *   npx issue-log bug "Title" --file path/to/file.ts --line 123 --priority P1
 *   npx issue-log logic "Title" --file path/to/file.ts --action "Fix the logic"
 *   npx issue-log test "Missing coverage for X" --file tests/path.test.ts
 *   npx issue-log list --status open --priority P0,P1
 *   npx issue-log stats
 *   npx issue-log import ./PENDING_MASTER.md
 * 
 * @module scripts/issue-log
 */

import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = process.env.ISSUE_API_URL || 'http://localhost:3000/api';
const API_TOKEN = process.env.ISSUE_API_TOKEN || '';

// ============================================================================
// HTTP CLIENT
// ============================================================================

async function apiRequest(
  method: string,
  endpoint: string,
  body?: any
): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (API_TOKEN) {
    headers['Authorization'] = `Bearer ${API_TOKEN}`;
  }
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    
    return data;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to API. Is the server running?');
      console.error(`   URL: ${url}`);
      process.exit(1);
    }
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function inferModule(filePath: string): { module: string; subModule?: string } {
  if (filePath.includes('/fm/')) {
    const match = filePath.match(/\/fm\/([^/]+)/);
    return { module: 'fm', subModule: match?.[1] };
  }
  if (filePath.includes('/souq/')) {
    const match = filePath.match(/\/souq\/([^/]+)/);
    return { module: 'souq', subModule: match?.[1] };
  }
  if (filePath.includes('/aqar/')) return { module: 'aqar' };
  if (filePath.includes('/auth/')) return { module: 'auth' };
  if (filePath.includes('/upload/')) return { module: 'upload' };
  if (filePath.includes('/tests/')) return { module: 'tests' };
  return { module: 'core' };
}

function inferPriority(category: string, description: string): string {
  const text = description.toLowerCase();
  
  if (text.includes('security') || text.includes('cross-tenant') || text.includes('leak')) {
    return 'P0';
  }
  if (text.includes('logic') || text.includes('rbac') || category === 'logic_error') {
    return 'P1';
  }
  if (category === 'missing_test' || category === 'efficiency') {
    return 'P2';
  }
  return 'P2';
}

function inferEffort(action: string): string {
  const text = action.toLowerCase();
  
  if (text.includes('add index') || text.includes('config')) return 'XS';
  if (text.includes('add guard') || text.includes('add filter')) return 'S';
  if (text.includes('add test') || text.includes('refactor')) return 'M';
  if (text.includes('backfill') || text.includes('migrate')) return 'L';
  return 'M';
}

function formatTable(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) => 
    Math.max(h.length, ...rows.map(r => (r[i] || '').length))
  );
  
  const separator = colWidths.map(w => '-'.repeat(w + 2)).join('+');
  const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ');
  const dataRows = rows.map(row => 
    row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join(' | ')
  );
  
  return [headerRow, separator, ...dataRows].join('\n');
}

function printStats(stats: any): void {
  console.log('\n📊 Issue Tracker Statistics\n');
  console.log('═'.repeat(50));
  
  const { summary, byPriority, byStatus } = stats;
  
  console.log('\n📈 Summary');
  console.log(`   Total Issues:    ${summary.total}`);
  console.log(`   Open:            ${summary.open}`);
  console.log(`   Critical (P0+P1):${summary.criticalOpen}`);
  console.log(`   Quick Wins:      ${summary.quickWinsCount}`);
  console.log(`   Stale (>7d):     ${summary.staleCount}`);
  console.log(`   Avg Age:         ${summary.avgAgeDays} days`);
  
  console.log('\n🎯 By Priority');
  console.log(`   🔴 P0 Critical:  ${byPriority.P0}`);
  console.log(`   🟠 P1 High:      ${byPriority.P1}`);
  console.log(`   🟡 P2 Medium:    ${byPriority.P2}`);
  console.log(`   🟢 P3 Low:       ${byPriority.P3}`);
  
  console.log('\n📂 By Status');
  console.log(`   Open:            ${byStatus.open}`);
  console.log(`   In Progress:     ${byStatus.inProgress}`);
  console.log(`   Blocked:         ${byStatus.blocked}`);
  console.log(`   Resolved:        ${byStatus.resolved}`);
  
  if (stats.quickWins?.length > 0) {
    console.log('\n🎯 Quick Wins (Top 5)');
    stats.quickWins.slice(0, 5).forEach((q: any, i: number) => {
      console.log(`   ${i + 1}. [${q.issueId}] ${q.title.substring(0, 50)}...`);
    });
  }
  
  if (stats.fileHeatMap?.length > 0) {
    console.log('\n🔥 Hottest Files');
    stats.fileHeatMap.slice(0, 5).forEach((f: any, i: number) => {
      console.log(`   ${i + 1}. ${f.file} (${f.total} issues)`);
    });
  }
  
  console.log('\n' + '═'.repeat(50));
}

function printIssueList(issues: any[], pagination: any): void {
  console.log(`\n📋 Issues (${pagination.total} total)\n`);
  
  if (issues.length === 0) {
    console.log('   No issues found.');
    return;
  }
  
  const headers = ['ID', 'Priority', 'Status', 'Title'];
  const rows = issues.map((i: any) => [
    i.issueId,
    i.priority,
    i.status,
    i.title.substring(0, 50) + (i.title.length > 50 ? '...' : ''),
  ]);
  
  console.log(formatTable(headers, rows));
  console.log(`\nPage ${pagination.page}/${pagination.totalPages}`);
}

// ============================================================================
// COMMANDS
// ============================================================================

program
  .name('issue-log')
  .description('CLI tool for logging and managing development issues')
  .version('1.0.0');

// Log a bug
program
  .command('bug <title>')
  .description('Log a new bug')
  .option('-f, --file <path>', 'File path where the bug exists')
  .option('-l, --line <number>', 'Line number')
  .option('-p, --priority <level>', 'Priority (P0, P1, P2, P3)')
  .option('-e, --effort <size>', 'Effort (XS, S, M, L, XL)')
  .option('-a, --action <text>', 'Action to take')
  .option('-d, --description <text>', 'Detailed description')
  .option('--dod <text>', 'Definition of Done')
  .action(async (title, options) => {
    try {
      const { module, subModule } = inferModule(options.file || '');
      
      const issue = {
        title,
        description: options.description || title,
        category: 'bug',
        priority: options.priority || inferPriority('bug', title),
        effort: options.effort || inferEffort(options.action || ''),
        location: {
          filePath: options.file || 'TBD',
          lineStart: options.line ? parseInt(options.line, 10) : undefined,
        },
        module,
        subModule,
        action: options.action || 'Investigate and fix',
        definitionOfDone: options.dod || 'Bug is fixed and verified',
      };
      
      const result = await apiRequest('POST', '/issues', issue);
      
      if (result.data.duplicate) {
        console.log(`⚠️  Duplicate found! Updated existing issue: ${result.data.issue.issueId}`);
      } else {
        console.log(`✅ Bug logged: ${result.data.issue.issueId}`);
      }
      console.log(`   ${title}`);
      console.log(`   File: ${options.file || 'TBD'}`);
      console.log(`   Priority: ${issue.priority} | Effort: ${issue.effort}`);
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Log a logic error
program
  .command('logic <title>')
  .description('Log a logic error')
  .option('-f, --file <path>', 'File path')
  .option('-l, --line <number>', 'Line number')
  .option('-p, --priority <level>', 'Priority')
  .option('-e, --effort <size>', 'Effort')
  .option('-a, --action <text>', 'Action to take')
  .option('-d, --description <text>', 'Description')
  .option('--dod <text>', 'Definition of Done')
  .action(async (title, options) => {
    try {
      const { module, subModule } = inferModule(options.file || '');
      
      const issue = {
        title,
        description: options.description || title,
        category: 'logic_error',
        priority: options.priority || 'P1',
        effort: options.effort || inferEffort(options.action || ''),
        location: {
          filePath: options.file || 'TBD',
          lineStart: options.line ? parseInt(options.line, 10) : undefined,
        },
        module,
        subModule,
        action: options.action || 'Fix logic error',
        definitionOfDone: options.dod || 'Logic corrected and verified',
      };
      
      const result = await apiRequest('POST', '/issues', issue);
      console.log(`✅ Logic error logged: ${result.data.issue.issueId}`);
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Log a missing test
program
  .command('test <title>')
  .description('Log a missing test')
  .option('-f, --file <path>', 'Test file path')
  .option('-a, --action <text>', 'What to test')
  .option('-d, --description <text>', 'Description')
  .action(async (title, options) => {
    try {
      const { module, subModule } = inferModule(options.file || '');
      
      const issue = {
        title: `Missing test: ${title}`,
        description: options.description || title,
        category: 'missing_test',
        priority: 'P2',
        effort: 'M',
        location: {
          filePath: options.file || 'tests/',
        },
        module,
        subModule,
        action: options.action || 'Add test coverage',
        definitionOfDone: 'Tests added and passing',
        riskTags: ['TEST_GAP'],
      };
      
      const result = await apiRequest('POST', '/issues', issue);
      console.log(`✅ Test gap logged: ${result.data.issue.issueId}`);
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Log efficiency improvement
program
  .command('perf <title>')
  .description('Log an efficiency/performance improvement')
  .option('-f, --file <path>', 'File path')
  .option('-l, --line <number>', 'Line number')
  .option('-a, --action <text>', 'Optimization action')
  .option('-d, --description <text>', 'Description')
  .action(async (title, options) => {
    try {
      const { module, subModule } = inferModule(options.file || '');
      
      const issue = {
        title,
        description: options.description || title,
        category: 'efficiency',
        priority: 'P2',
        effort: inferEffort(options.action || ''),
        location: {
          filePath: options.file || 'TBD',
          lineStart: options.line ? parseInt(options.line, 10) : undefined,
        },
        module,
        subModule,
        action: options.action || 'Optimize for performance',
        definitionOfDone: 'Performance improved and measured',
        riskTags: ['PERFORMANCE'],
      };
      
      const result = await apiRequest('POST', '/issues', issue);
      console.log(`✅ Performance issue logged: ${result.data.issue.issueId}`);
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// List issues
program
  .command('list')
  .description('List issues')
  .option('-s, --status <status>', 'Filter by status')
  .option('-p, --priority <priority>', 'Filter by priority (comma-separated)')
  .option('-c, --category <category>', 'Filter by category')
  .option('-m, --module <module>', 'Filter by module')
  .option('--quick-wins', 'Show only quick wins')
  .option('--stale', 'Show only stale issues')
  .option('-n, --limit <number>', 'Number of results', '20')
  .action(async (options) => {
    try {
      const params = new URLSearchParams();
      if (options.status) params.set('status', options.status);
      if (options.priority) params.set('priority', options.priority);
      if (options.category) params.set('category', options.category);
      if (options.module) params.set('module', options.module);
      if (options.quickWins) params.set('quickWins', 'true');
      if (options.stale) params.set('stale', 'true');
      params.set('limit', options.limit);
      
      const result = await apiRequest('GET', `/issues?${params}`);
      printIssueList(result.data.issues, result.data.pagination);
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Show stats
program
  .command('stats')
  .description('Show issue statistics')
  .action(async () => {
    try {
      const result = await apiRequest('GET', '/issues/stats');
      printStats(result.data);
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Update issue status
program
  .command('update <id>')
  .description('Update an issue')
  .option('-s, --status <status>', 'New status')
  .option('-p, --priority <priority>', 'New priority')
  .option('-a, --assignee <email>', 'Assign to')
  .option('-c, --comment <text>', 'Add comment')
  .action(async (id, options) => {
    try {
      const updates: any = {};
      if (options.status) updates.status = options.status;
      if (options.priority) updates.priority = options.priority;
      if (options.assignee) updates.assignedTo = options.assignee;
      if (options.comment) updates.comment = { content: options.comment };
      
      await apiRequest('PATCH', `/issues/${id}`, updates);
      console.log(`✅ Issue ${id} updated`);
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Import from PENDING_MASTER.md
program
  .command('import <file>')
  .description('Import issues from PENDING_MASTER.md')
  .option('--dry-run', 'Preview without importing')
  .action(async (file, options) => {
    try {
      const filePath = path.resolve(file);
      
      if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      
      console.log(`📂 Reading ${filePath}...`);
      console.log(`   Content length: ${content.length} characters`);
      
      const result = await apiRequest('POST', '/issues/import', {
        content,
        dryRun: options.dryRun || false,
      });
      
      if (options.dryRun) {
        console.log('\n🔍 Preview (Dry Run)');
        console.log(`   Parsed: ${result.data.parsed} items`);
        console.log(`   After dedup: ${result.data.afterDedup} items`);
        console.log('\n   By Category:');
        console.log(`   🐛 Bugs: ${result.data.byCategory.bugs}`);
        console.log(`   ⚠️  Logic: ${result.data.byCategory.logic}`);
        console.log(`   🧪 Tests: ${result.data.byCategory.tests}`);
        console.log(`   ⚡ Efficiency: ${result.data.byCategory.efficiency}`);
        console.log(`   📋 Next Steps: ${result.data.byCategory.nextSteps}`);
      } else {
        console.log('\n✅ Import Complete');
        console.log(`   Created: ${result.data.created}`);
        console.log(`   Updated: ${result.data.updated}`);
        console.log(`   Skipped: ${result.data.skipped}`);
        if (result.data.errors?.length) {
          console.log(`   Errors: ${result.data.errors.length}`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Interactive issue logging')
  .action(async () => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    const question = (prompt: string): Promise<string> => 
      new Promise(resolve => rl.question(prompt, resolve));
    
    try {
      console.log('\n🎯 Interactive Issue Logger\n');
      
      const category = await question('Category (bug/logic/test/perf): ');
      const title = await question('Title: ');
      const file = await question('File path: ');
      const line = await question('Line number (optional): ');
      const action = await question('Action to take: ');
      const priority = await question('Priority (P0/P1/P2/P3, default P2): ') || 'P2';
      
      const { module, subModule } = inferModule(file);
      
      const categoryMap: Record<string, string> = {
        bug: 'bug',
        logic: 'logic_error',
        test: 'missing_test',
        perf: 'efficiency',
      };
      
      const issue = {
        title,
        description: title,
        category: categoryMap[category] || 'bug',
        priority,
        effort: inferEffort(action),
        location: {
          filePath: file || 'TBD',
          lineStart: line ? parseInt(line, 10) : undefined,
        },
        module,
        subModule,
        action: action || 'Investigate and fix',
        definitionOfDone: 'Issue resolved and verified',
      };
      
      const result = await apiRequest('POST', '/issues', issue);
      console.log(`\n✅ Issue logged: ${result.data.issue.issueId}`);
      
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    } finally {
      rl.close();
    }
  });

// Quick file scan (find issues in a file)
program
  .command('scan <file>')
  .description('Show issues related to a file')
  .action(async (file) => {
    try {
      const result = await apiRequest('GET', `/issues?file=${encodeURIComponent(file)}`);
      
      if (result.data.issues.length === 0) {
        console.log(`\n✅ No issues found for: ${file}`);
        return;
      }
      
      console.log(`\n📂 Issues in ${file}:\n`);
      result.data.issues.forEach((issue: any) => {
        const icon = issue.category === 'bug' ? '🐛' : 
                     issue.category === 'logic_error' ? '⚠️' :
                     issue.category === 'missing_test' ? '🧪' : '📌';
        console.log(`${icon} [${issue.issueId}] ${issue.priority} - ${issue.title}`);
        if (issue.location.lineStart) {
          console.log(`   Line ${issue.location.lineStart}${issue.location.lineEnd ? `-${issue.location.lineEnd}` : ''}`);
        }
        console.log(`   Action: ${issue.action.substring(0, 60)}...`);
        console.log('');
      });
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();
