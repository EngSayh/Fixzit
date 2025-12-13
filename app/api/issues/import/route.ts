/**
 * Issues Import API Route Handler
 * POST /api/issues/import - Bulk import issues from various sources
 * 
 * @module app/api/issues/import/route
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { logger } from "@/lib/logger";
import {
  Issue,
  IssueCategory,
  IssuePriority,
  IssueStatus,
  IssueEffort,
  IssueSource,
  type IssueCategoryType,
  type IssuePriorityType,
  type IssueEffortType,
} from "@/server/models/Issue";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { parseBodySafe } from "@/lib/api/parse-body";

// ============================================================================
// TYPES
// ============================================================================

interface ImportIssue {
  id?: string;
  legacyId?: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  effort?: string;
  status?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  functionName?: string;
  module?: string;
  subModule?: string;
  action?: string;
  rootCause?: string;
  definitionOfDone?: string;
  riskTags?: string[];
  labels?: string[];
  assignedTo?: string;
}

interface ImportBody {
  source: string;
  issues: ImportIssue[];
  options?: {
    skipDuplicates?: boolean;
    updateExisting?: boolean;
    dryRun?: boolean;
  };
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ index: number; error: string; issue?: ImportIssue }>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function normalizeCategory(category?: string): IssueCategoryType {
  if (!category) return IssueCategory.BUG;
  
  const normalized = category.toLowerCase().replace(/[_-]/g, '');
  
  const mapping: Record<string, IssueCategoryType> = {
    bug: IssueCategory.BUG,
    logicerror: IssueCategory.LOGIC_ERROR,
    logic: IssueCategory.LOGIC_ERROR,
    missingtest: IssueCategory.MISSING_TEST,
    test: IssueCategory.MISSING_TEST,
    efficiency: IssueCategory.EFFICIENCY,
    performance: IssueCategory.EFFICIENCY,
    security: IssueCategory.SECURITY,
    feature: IssueCategory.FEATURE,
    enhancement: IssueCategory.FEATURE,
    refactor: IssueCategory.REFACTOR,
    documentation: IssueCategory.DOCUMENTATION,
    docs: IssueCategory.DOCUMENTATION,
    nextstep: IssueCategory.NEXT_STEP,
    todo: IssueCategory.NEXT_STEP,
  };
  
  return mapping[normalized] || IssueCategory.BUG;
}

function normalizePriority(priority?: string): IssuePriorityType {
  if (!priority) return IssuePriority.P2_MEDIUM;
  
  const normalized = priority.toUpperCase().replace(/[_-]/g, '');
  
  if (normalized.includes('P0') || normalized.includes('CRITICAL')) {
    return IssuePriority.P0_CRITICAL;
  }
  if (normalized.includes('P1') || normalized.includes('HIGH')) {
    return IssuePriority.P1_HIGH;
  }
  if (normalized.includes('P2') || normalized.includes('MEDIUM')) {
    return IssuePriority.P2_MEDIUM;
  }
  if (normalized.includes('P3') || normalized.includes('LOW')) {
    return IssuePriority.P3_LOW;
  }
  
  return IssuePriority.P2_MEDIUM;
}

function normalizeEffort(effort?: string): IssueEffortType {
  if (!effort) return IssueEffort.M;
  
  const normalized = effort.toUpperCase().replace(/[_-]/g, '');
  
  if (normalized === 'XS' || normalized.includes('TINY')) return IssueEffort.XS;
  if (normalized === 'S' || normalized.includes('SMALL')) return IssueEffort.S;
  if (normalized === 'M' || normalized.includes('MEDIUM')) return IssueEffort.M;
  if (normalized === 'L' || normalized.includes('LARGE')) return IssueEffort.L;
  if (normalized === 'XL' || normalized.includes('XLARGE')) return IssueEffort.XL;
  
  return IssueEffort.M;
}

function normalizeStatus(status?: string): string {
  if (!status) return IssueStatus.OPEN;
  
  const normalized = status.toLowerCase().replace(/[_-]/g, '');
  
  const mapping: Record<string, string> = {
    open: IssueStatus.OPEN,
    new: IssueStatus.OPEN,
    todo: IssueStatus.OPEN,
    inprogress: IssueStatus.IN_PROGRESS,
    wip: IssueStatus.IN_PROGRESS,
    working: IssueStatus.IN_PROGRESS,
    inreview: IssueStatus.IN_REVIEW,
    review: IssueStatus.IN_REVIEW,
    blocked: IssueStatus.BLOCKED,
    resolved: IssueStatus.RESOLVED,
    fixed: IssueStatus.RESOLVED,
    closed: IssueStatus.CLOSED,
    done: IssueStatus.CLOSED,
    wontfix: IssueStatus.WONT_FIX,
    invalid: IssueStatus.WONT_FIX,
  };
  
  return mapping[normalized] || IssueStatus.OPEN;
}

function extractModule(filePath?: string): string {
  if (!filePath) return 'general';
  
  // Extract module from path like "app/api/billing/..." or "components/..."
  const parts = filePath.split('/').filter(Boolean);
  
  if (parts[0] === 'app' && parts[1] === 'api' && parts.length > 2) {
    return parts[2];
  }
  if (parts[0] === 'app' && parts.length > 1) {
    return parts[1].replace(/[()]/g, '');
  }
  if (parts[0] === 'components' || parts[0] === 'lib' || parts[0] === 'server') {
    return parts.length > 1 ? parts[1] : parts[0];
  }
  
  return parts[0] || 'general';
}

// ============================================================================
// POST /api/issues/import
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const result = await getSessionOrNull(request);
    
    if (!result.ok) {
      return result.response;
    }
    
    const session = result.session;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only super_admin and admin can import
    const allowedRoles = ['super_admin', 'admin'];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const bodyResult = await parseBodySafe<ImportBody>(request);
    
    if (bodyResult.error || !bodyResult.data) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { source, issues, options = {} } = bodyResult.data;
    
    if (!issues || !Array.isArray(issues) || issues.length === 0) {
      return NextResponse.json({ error: 'No issues to import' }, { status: 400 });
    }
    
    if (issues.length > 1000) {
      return NextResponse.json(
        { error: 'Maximum 1000 issues per import' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    const orgId = new mongoose.Types.ObjectId(session.orgId);
    const importResult: ImportResult = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };
    
    // Process in batches
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < issues.length; i += batchSize) {
      batches.push(issues.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      const bulkOps = [];
      
      for (let i = 0; i < batch.length; i++) {
        const issue = batch[i];
        const globalIndex = batches.indexOf(batch) * batchSize + i;
        
        try {
          // Validate required fields
          if (!issue.title || typeof issue.title !== 'string') {
            importResult.errors.push({
              index: globalIndex,
              error: 'Missing or invalid title',
              issue,
            });
            continue;
          }
          
          const legacyId = issue.legacyId || issue.id || `import-${Date.now()}-${globalIndex}`;
          
          // Check for existing issue
          if (options.skipDuplicates || options.updateExisting) {
            const existing = await Issue.findOne({
              orgId,
              $or: [
                { legacyId },
                { title: issue.title, 'location.filePath': issue.filePath },
              ],
            });
            
            if (existing) {
              if (options.skipDuplicates) {
                importResult.skipped++;
                continue;
              }
              
              if (options.updateExisting && !options.dryRun) {
                await Issue.updateOne(
                  { _id: existing._id },
                  {
                    $set: {
                      description: issue.description || existing.description,
                      priority: normalizePriority(issue.priority),
                      status: normalizeStatus(issue.status),
                      labels: issue.labels || existing.labels,
                      updatedAt: new Date(),
                    },
                  }
                );
                importResult.updated++;
                continue;
              }
            }
          }
          
          // Prepare new issue document
          const issueModule = issue.module || extractModule(issue.filePath);
          
          const newIssue = {
            orgId,
            title: issue.title.trim(),
            description: issue.description || '',
            category: normalizeCategory(issue.category),
            priority: normalizePriority(issue.priority),
            status: normalizeStatus(issue.status),
            effort: normalizeEffort(issue.effort),
            source: IssueSource.IMPORT,
            sourceDetail: source,
            legacyId,
            location: {
              filePath: issue.filePath || '',
              lineStart: issue.lineStart,
              lineEnd: issue.lineEnd,
              functionName: issue.functionName,
            },
            module: issueModule,
            subModule: issue.subModule,
            action: issue.action || `Fix: ${issue.title}`,
            rootCause: issue.rootCause,
            definitionOfDone: issue.definitionOfDone || 'Issue resolved and verified',
            riskTags: issue.riskTags || [],
            labels: issue.labels || [],
            assignedTo: issue.assignedTo,
            reportedBy: session.id,
            firstSeenAt: new Date(),
            sprintReady: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          if (!options.dryRun) {
            bulkOps.push({
              insertOne: { document: newIssue },
            });
          }
          
          importResult.imported++;
          
        } catch (error) {
          importResult.errors.push({
            index: globalIndex,
            error: error instanceof Error ? error.message : 'Unknown error',
            issue,
          });
        }
      }
      
      // Execute bulk operations
      if (bulkOps.length > 0 && !options.dryRun) {
        try {
          await Issue.bulkWrite(bulkOps);
        } catch (error) {
          logger.error('[Issues Import] Bulk write error', { error });
          // Errors in bulk write should be handled individually
        }
      }
    }
    
    logger.info('[Issues Import] Import completed', {
      orgId: session.orgId,
      source,
      ...importResult,
      dryRun: options.dryRun,
    });
    
    return NextResponse.json({
      success: true,
      dryRun: options.dryRun || false,
      result: importResult,
    });
    
  } catch (error) {
    logger.error('[Issues Import] Error importing issues', { error });
    return NextResponse.json(
      { error: 'Failed to import issues' },
      { status: 500 }
    );
  }
}
