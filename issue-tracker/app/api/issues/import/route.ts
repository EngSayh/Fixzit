/**
 * Bulk Import API Route Handler
 * POST /api/issues/import - Import issues from PENDING_MASTER.md format
 * 
 * @module app/api/issues/import/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import Issue, {
  IssueCategory,
  IssuePriority,
  IssueStatus,
  IssueEffort,
  IssueSource,
  RiskTag,
  IssueCategoryType,
  IssuePriorityType,
  IssueEffortType,
  RiskTagType,
} from '@/models/issue';
import { connectDB } from '@/lib/db';
import { authOptions } from '@/lib/auth';

// ============================================================================
// PARSER TYPES
// ============================================================================

interface ParsedIssue {
  legacyId?: string;
  title: string;
  description: string;
  category: IssueCategoryType;
  priority: IssuePriorityType;
  effort: IssueEffortType;
  location: {
    filePath: string;
    lineStart?: number;
    lineEnd?: number;
  };
  module: string;
  subModule?: string;
  action: string;
  rootCause?: string;
  definitionOfDone: string;
  riskTags: RiskTagType[];
  validation?: {
    type: 'test' | 'assertion' | 'manual';
    command?: string;
    expectedResult?: string;
  };
  auditSession: string;
  sourceDate: Date;
}

// ============================================================================
// PARSER FUNCTIONS
// ============================================================================

function inferPriority(text: string, category: IssueCategoryType): IssuePriorityType {
  const lowerText = text.toLowerCase();
  
  // P0 indicators
  if (
    lowerText.includes('cross-tenant') ||
    lowerText.includes('data leak') ||
    lowerText.includes('security') ||
    lowerText.includes('rbac bypass') ||
    lowerText.includes('authentication') ||
    lowerText.includes('cross-unit')
  ) {
    return IssuePriority.P0_CRITICAL;
  }
  
  // P1 indicators
  if (
    lowerText.includes('vendor scoping') ||
    lowerText.includes('ownership') ||
    lowerText.includes('authorization') ||
    lowerText.includes('premature') ||
    category === IssueCategory.LOGIC_ERROR
  ) {
    return IssuePriority.P1_HIGH;
  }
  
  // P2 indicators
  if (
    category === IssueCategory.MISSING_TEST ||
    category === IssueCategory.EFFICIENCY ||
    lowerText.includes('index') ||
    lowerText.includes('projection')
  ) {
    return IssuePriority.P2_MEDIUM;
  }
  
  return IssuePriority.P3_LOW;
}

function inferEffort(action: string): IssueEffortType {
  const lowerAction = action.toLowerCase();
  
  if (
    lowerAction.includes('add index') ||
    lowerAction.includes('add projection') ||
    lowerAction.includes('use lean()')
  ) {
    return IssueEffort.XS;
  }
  
  if (
    lowerAction.includes('add guard') ||
    lowerAction.includes('add filter') ||
    lowerAction.includes('add assertion') ||
    lowerAction.includes('wrap with')
  ) {
    return IssueEffort.S;
  }
  
  if (
    lowerAction.includes('add test') ||
    lowerAction.includes('add coverage') ||
    lowerAction.includes('update tests')
  ) {
    return IssueEffort.M;
  }
  
  if (
    lowerAction.includes('refactor') ||
    lowerAction.includes('extend') ||
    lowerAction.includes('backfill')
  ) {
    return IssueEffort.L;
  }
  
  return IssueEffort.M; // Default
}

function inferRiskTags(text: string): RiskTagType[] {
  const tags: RiskTagType[] = [];
  const lowerText = text.toLowerCase();
  
  if (
    lowerText.includes('tenant') ||
    lowerText.includes('org') ||
    lowerText.includes('unit') ||
    lowerText.includes('scoping')
  ) {
    tags.push(RiskTag.MULTI_TENANT);
  }
  
  if (
    lowerText.includes('auth') ||
    lowerText.includes('rbac') ||
    lowerText.includes('role') ||
    lowerText.includes('permission') ||
    lowerText.includes('guard')
  ) {
    tags.push(RiskTag.SECURITY);
  }
  
  if (
    lowerText.includes('test') ||
    lowerText.includes('coverage') ||
    lowerText.includes('assertion')
  ) {
    tags.push(RiskTag.TEST_GAP);
  }
  
  if (
    lowerText.includes('index') ||
    lowerText.includes('query') ||
    lowerText.includes('scan') ||
    lowerText.includes('projection') ||
    lowerText.includes('lean')
  ) {
    tags.push(RiskTag.PERFORMANCE);
  }
  
  if (
    lowerText.includes('budget') ||
    lowerText.includes('payment') ||
    lowerText.includes('invoice') ||
    lowerText.includes('billing') ||
    lowerText.includes('kyc')
  ) {
    tags.push(RiskTag.FINANCIAL);
  }
  
  return [...new Set(tags)]; // Remove duplicates
}

function extractModule(filePath: string): { module: string; subModule?: string } {
  const parts = filePath.split('/');
  
  // Common patterns
  if (filePath.includes('/fm/')) {
    const subIdx = parts.indexOf('fm');
    return {
      module: 'fm',
      subModule: parts[subIdx + 1] || undefined,
    };
  }
  
  if (filePath.includes('/souq/')) {
    const subIdx = parts.indexOf('souq');
    return {
      module: 'souq',
      subModule: parts[subIdx + 1] || undefined,
    };
  }
  
  if (filePath.includes('/aqar/')) {
    return { module: 'aqar' };
  }
  
  if (filePath.includes('/auth/') || filePath.includes('/api/auth')) {
    return { module: 'auth' };
  }
  
  if (filePath.includes('/upload/')) {
    return { module: 'upload' };
  }
  
  if (filePath.includes('/tests/')) {
    return { module: 'tests' };
  }
  
  return { module: 'core' };
}

function parseLocation(locationStr: string): { filePath: string; lineStart?: number; lineEnd?: number } {
  // Pattern: file.ts:123-456 or file.ts:123 or just file.ts
  const match = locationStr.match(/^([^:]+)(?::(\d+)(?:-(\d+))?)?$/);
  
  if (!match) {
    return { filePath: locationStr };
  }
  
  return {
    filePath: match[1],
    lineStart: match[2] ? parseInt(match[2], 10) : undefined,
    lineEnd: match[3] ? parseInt(match[3], 10) : undefined,
  };
}

function parsePendingMaster(content: string): ParsedIssue[] {
  const issues: ParsedIssue[] = [];
  const lines = content.split('\n');
  
  let currentSession = '';
  let currentDate = new Date();
  let currentSection = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect session header
    const sessionMatch = line.match(/^## 🗓️ (\d{4}-\d{2}-\d{2}T[\d:+]+)/);
    if (sessionMatch) {
      currentSession = sessionMatch[1];
      currentDate = new Date(sessionMatch[1]);
      continue;
    }
    
    // Detect section headers
    if (line.includes('Identified bugs') || line.includes('#### Bugs')) {
      currentSection = 'bugs';
      continue;
    }
    if (line.includes('Logic errors') || line.includes('#### Logic Errors')) {
      currentSection = 'logic';
      continue;
    }
    if (line.includes('Missing tests') || line.includes('#### Missing Tests')) {
      currentSection = 'tests';
      continue;
    }
    if (line.includes('Efficiency') || line.includes('#### Efficiency')) {
      currentSection = 'efficiency';
      continue;
    }
    if (line.includes('Next Steps') || line.includes('Planned Next Steps')) {
      currentSection = 'next_steps';
      continue;
    }
    
    // Skip completed items
    if (line.includes('✅') || line.includes('🟢') || line.includes('Fixed') || line.includes('Done')) {
      continue;
    }
    
    // Parse bug entries (table format or list format)
    if (currentSection === 'bugs' && line.startsWith('|') && !line.includes('---')) {
      const cols = line.split('|').map(c => c.trim()).filter(c => c);
      if (cols.length >= 4 && cols[0] !== 'ID' && cols[0] !== 'Location') {
        // Check if it's a pending item
        const statusCol = cols[cols.length - 1];
        if (statusCol.includes('🟡') || statusCol.includes('🔲') || statusCol.includes('⏳')) {
          const location = parseLocation(cols[1] || cols[0]);
          const { module, subModule } = extractModule(location.filePath);
          
          issues.push({
            legacyId: cols[0].match(/BUG-\d+/)?.[0],
            title: cols[2]?.substring(0, 200) || 'Untitled Bug',
            description: cols[2] || '',
            category: IssueCategory.BUG,
            priority: inferPriority(cols[2] || '', IssueCategory.BUG),
            effort: inferEffort(cols[3] || ''),
            location,
            module,
            subModule,
            action: cols[3] || 'Investigate and fix',
            definitionOfDone: 'Bug is fixed and verified',
            riskTags: inferRiskTags(cols[2] || ''),
            auditSession: currentSession,
            sourceDate: currentDate,
          });
        }
      }
    }
    
    // Parse list format bugs/issues
    if (line.startsWith('- `') && (currentSection === 'bugs' || currentSection === 'logic' || currentSection === 'efficiency')) {
      // Skip if marked done
      if (line.includes('✅') || line.includes('🟢')) continue;
      
      const locationMatch = line.match(/`([^`]+)`/);
      if (locationMatch) {
        const location = parseLocation(locationMatch[1]);
        const { module, subModule } = extractModule(location.filePath);
        const descriptionPart = line.replace(/`[^`]+`/, '').replace(/^-\s*/, '').replace(/—/, '').trim();
        
        // Extract action if present
        let action = 'Investigate and fix';
        const actionMatch = descriptionPart.match(/Action:\s*(.+?)(?:\.|$)/i);
        if (actionMatch) {
          action = actionMatch[1].trim();
        }
        
        const category = currentSection === 'bugs' 
          ? IssueCategory.BUG 
          : currentSection === 'logic' 
            ? IssueCategory.LOGIC_ERROR 
            : IssueCategory.EFFICIENCY;
        
        issues.push({
          title: descriptionPart.substring(0, 200),
          description: descriptionPart,
          category,
          priority: inferPriority(descriptionPart, category),
          effort: inferEffort(action),
          location,
          module,
          subModule,
          action,
          definitionOfDone: `${category} is resolved and verified`,
          riskTags: inferRiskTags(descriptionPart),
          auditSession: currentSession,
          sourceDate: currentDate,
        });
      }
    }
    
    // Parse logic errors table
    if (currentSection === 'logic' && line.startsWith('|') && !line.includes('---')) {
      const cols = line.split('|').map(c => c.trim()).filter(c => c);
      if (cols.length >= 4 && cols[0] !== 'ID' && cols[0] !== 'Location') {
        const statusCol = cols[cols.length - 1];
        if (statusCol.includes('🟡') || statusCol.includes('🔲') || statusCol.includes('⏳') || statusCol.includes('TODO')) {
          const location = parseLocation(cols[1] || cols[0]);
          const { module, subModule } = extractModule(location.filePath);
          
          issues.push({
            legacyId: cols[0].match(/LOGIC-\d+/)?.[0],
            title: cols[2]?.substring(0, 200) || 'Untitled Logic Error',
            description: cols[2] || '',
            category: IssueCategory.LOGIC_ERROR,
            priority: inferPriority(cols[2] || '', IssueCategory.LOGIC_ERROR),
            effort: inferEffort(cols[3] || ''),
            location,
            module,
            subModule,
            action: cols[3] || 'Fix logic error',
            definitionOfDone: 'Logic corrected and verified',
            riskTags: inferRiskTags(cols[2] || ''),
            auditSession: currentSession,
            sourceDate: currentDate,
          });
        }
      }
    }
    
    // Parse missing tests table
    if (currentSection === 'tests' && line.startsWith('|') && !line.includes('---')) {
      const cols = line.split('|').map(c => c.trim()).filter(c => c);
      if (cols.length >= 3 && cols[0] !== 'Area' && cols[0] !== 'ID') {
        const statusCol = cols[cols.length - 1];
        if (statusCol.includes('🔲') || statusCol.includes('⏳') || statusCol.includes('TODO')) {
          const filePath = cols[0].includes('/') ? cols[0] : `tests/${cols[0]}`;
          const location = parseLocation(filePath);
          const { module, subModule } = extractModule(location.filePath);
          
          issues.push({
            title: `Missing test: ${cols[1]?.substring(0, 180) || cols[0]}`,
            description: cols[1] || '',
            category: IssueCategory.MISSING_TEST,
            priority: IssuePriority.P2_MEDIUM,
            effort: IssueEffort.M,
            location,
            module,
            subModule,
            action: cols[2] || 'Add test coverage',
            definitionOfDone: 'Tests added and passing',
            riskTags: [RiskTag.TEST_GAP],
            auditSession: currentSession,
            sourceDate: currentDate,
          });
        }
      }
    }
    
    // Parse next steps (bullet points)
    if (currentSection === 'next_steps' && line.startsWith('- ') && !line.includes('✅')) {
      const content = line.replace(/^-\s*/, '').trim();
      if (content.length > 10) { // Skip very short items
        issues.push({
          title: content.substring(0, 200),
          description: content,
          category: IssueCategory.NEXT_STEP,
          priority: inferPriority(content, IssueCategory.NEXT_STEP),
          effort: inferEffort(content),
          location: { filePath: 'TBD' },
          module: 'core',
          action: content,
          definitionOfDone: 'Task completed',
          riskTags: inferRiskTags(content),
          auditSession: currentSession,
          sourceDate: currentDate,
        });
      }
    }
  }
  
  return issues;
}

function deduplicateIssues(issues: ParsedIssue[]): ParsedIssue[] {
  const seen = new Map<string, ParsedIssue>();
  
  for (const issue of issues) {
    const key = `${issue.location.filePath}:${issue.location.lineStart || 0}:${issue.category}`;
    
    if (!seen.has(key)) {
      seen.set(key, issue);
    } else {
      // Keep the more recent one
      const existing = seen.get(key)!;
      if (issue.sourceDate > existing.sourceDate) {
        seen.set(key, issue);
      }
    }
  }
  
  return Array.from(seen.values());
}

// ============================================================================
// POST /api/issues/import
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only super_admin can bulk import
    if (session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }
    
    await connectDB();
    
    const body = await request.json();
    const { content, dryRun = false } = body;
    
    if (!content) {
      return NextResponse.json(
        { error: 'Missing content field' },
        { status: 400 }
      );
    }
    
    // Parse the content
    const parsedIssues = parsePendingMaster(content);
    const deduplicatedIssues = deduplicateIssues(parsedIssues);
    
    if (dryRun) {
      return NextResponse.json({
        success: true,
        data: {
          dryRun: true,
          parsed: parsedIssues.length,
          afterDedup: deduplicatedIssues.length,
          preview: deduplicatedIssues.slice(0, 20),
          byCategory: {
            bugs: deduplicatedIssues.filter(i => i.category === IssueCategory.BUG).length,
            logic: deduplicatedIssues.filter(i => i.category === IssueCategory.LOGIC_ERROR).length,
            tests: deduplicatedIssues.filter(i => i.category === IssueCategory.MISSING_TEST).length,
            efficiency: deduplicatedIssues.filter(i => i.category === IssueCategory.EFFICIENCY).length,
            nextSteps: deduplicatedIssues.filter(i => i.category === IssueCategory.NEXT_STEP).length,
          },
        },
      });
    }
    
    const orgId = new mongoose.Types.ObjectId(session.user.orgId);
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };
    
    for (const parsed of deduplicatedIssues) {
      try {
        // Check for existing issue
        const existing = await Issue.findOne({
          orgId,
          'location.filePath': parsed.location.filePath,
          'location.lineStart': parsed.location.lineStart,
          category: parsed.category,
        });
        
        if (existing) {
          // Update mention count and last seen
          await existing.recordAuditMention(parsed.auditSession, parsed.description);
          results.updated++;
        } else {
          // Generate new issue ID
          const issueId = await Issue.generateIssueId(parsed.category);
          
          // Create new issue
          const issue = new Issue({
            issueId,
            legacyId: parsed.legacyId,
            title: parsed.title,
            description: parsed.description,
            category: parsed.category,
            priority: parsed.priority,
            effort: parsed.effort,
            status: IssueStatus.OPEN,
            location: parsed.location,
            module: parsed.module,
            subModule: parsed.subModule,
            action: parsed.action,
            definitionOfDone: parsed.definitionOfDone,
            riskTags: parsed.riskTags,
            validation: parsed.validation,
            source: IssueSource.IMPORT,
            reportedBy: session.user.email || 'import',
            orgId,
            sprintReady: true,
            firstSeenAt: parsed.sourceDate,
            lastSeenAt: new Date(),
            mentionCount: 1,
            auditEntries: [{
              sessionId: parsed.auditSession,
              timestamp: parsed.sourceDate,
              findings: parsed.description,
            }],
          });
          
          await issue.save();
          results.created++;
        }
      } catch (error: any) {
        results.errors.push(`Failed to process: ${parsed.title.substring(0, 50)} - ${error.message}`);
        results.skipped++;
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        parsed: parsedIssues.length,
        afterDedup: deduplicatedIssues.length,
        ...results,
      },
    });
    
  } catch (error) {
    console.error('POST /api/issues/import error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
