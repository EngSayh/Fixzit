/**
 * Issues API Route Handler
 * GET /api/issues - List issues with filters
 * POST /api/issues - Create new issue
 * 
 * @module app/api/issues/route
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { createHash } from "crypto";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import {
  Issue,
  IssueCategory,
  IssuePriority,
  IssueStatus,
  IssueEffort,
  IssueSource,
} from "@/server/models/Issue";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { parseBodySafe } from "@/lib/api/parse-body";
import { getSuperadminSession } from "@/lib/superadmin/auth";

// ============================================================================
// TYPES
// ============================================================================

interface ListQuery {
  page?: string;
  limit?: string;
  status?: string;
  priority?: string;
  category?: string;
  module?: string;
  assignedTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  sprintReady?: string;
  quickWins?: string;
  stale?: string;
  file?: string;
}

interface CreateIssueBody {
  title: string;
  description: string;
  category: string;
  priority: string;
  effort: string;
  location: {
    filePath: string;
    lineStart?: number;
    lineEnd?: number;
    functionName?: string;
  };
  module: string;
  subModule?: string;
  action: string;
  rootCause?: string;
  definitionOfDone: string;
  riskTags?: string[];
  dependencies?: string[];
  suggestedPrTitle?: string;
  validation?: {
    type: string;
    command?: string;
    expectedResult?: string;
  };
  labels?: string[];
  legacyId?: string;
  source?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function deriveIssueKey(body: CreateIssueBody, issueId: string): string {
  if (body.legacyId) return slugify(body.legacyId);
  const location = body.location?.filePath ? `|${body.location.filePath}` : "";
  return slugify(`${body.title}|${body.category}${location}`) || slugify(issueId);
}

function computeSourceHash(snippet: string, location?: string): string {
  return createHash("sha256")
    .update(`${location || "none"}::${snippet}`)
    .digest("hex");
}

async function resolveIssueSession(request: NextRequest) {
  const superadmin = await getSuperadminSession(request);
  if (superadmin) {
    return {
      ok: true as const,
      session: {
        id: superadmin.username,
        role: "super_admin",
        orgId: superadmin.orgId,
        email: superadmin.username,
        isSuperAdmin: true,
      },
    };
  }

  return getSessionOrNull(request);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildFilterQuery(query: ListQuery, orgId: mongoose.Types.ObjectId) {
  const filter: Record<string, unknown> = { orgId };
  
  if (query.status) {
    const statuses = query.status.split(',');
    filter.status = { $in: statuses };
  }
  
  if (query.priority) {
    const priorities = query.priority.split(',');
    filter.priority = { $in: priorities };
  }
  
  if (query.category) {
    const categories = query.category.split(',');
    filter.category = { $in: categories };
  }
  
  if (query.module) {
    filter.module = query.module;
  }
  
  if (query.assignedTo) {
    filter.assignedTo = query.assignedTo;
  }
  
  if (query.file) {
    filter['location.filePath'] = { $regex: query.file, $options: 'i' };
  }
  
  if (query.sprintReady === 'true') {
    filter.sprintReady = true;
    filter.blockedBy = { $exists: false };
  }
  
  if (query.quickWins === 'true') {
    filter.status = IssueStatus.OPEN;
    filter.effort = { $in: [IssueEffort.XS, IssueEffort.S] };
    filter.priority = { $in: [IssuePriority.P1_HIGH, IssuePriority.P2_MEDIUM] };
    filter.blockedBy = { $exists: false };
  }
  
  if (query.stale === 'true') {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 7);
    filter.status = IssueStatus.OPEN;
    filter.firstSeenAt = { $lt: staleDate };
  }
  
  if (query.search) {
    filter.$text = { $search: query.search };
  }
  
  return filter;
}

type SortSpec = Record<string, 1 | -1>;

function buildSortQuery(query: ListQuery): SortSpec {
  const sortBy = query.sortBy || 'priority';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  
  const sortMap: Record<string, SortSpec> = {
    priority: { priority: sortOrder, createdAt: -1 },
    status: { status: sortOrder, priority: 1 },
    created: { createdAt: sortOrder },
    updated: { updatedAt: sortOrder },
    age: { firstSeenAt: sortOrder },
    effort: { effort: sortOrder, priority: 1 },
  };
  
  return sortMap[sortBy] || sortMap.priority;
}

// ============================================================================
// GET /api/issues
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const result = await resolveIssueSession(request);
    
    if (!result.ok) {
      return result.response;
    }
    
    const session = result.session;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check for super admin or admin role
    const allowedRoles = ['super_admin', 'admin', 'developer'];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const query: ListQuery = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      category: searchParams.get('category') || undefined,
      module: searchParams.get('module') || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined,
      sprintReady: searchParams.get('sprintReady') || undefined,
      quickWins: searchParams.get('quickWins') || undefined,
      stale: searchParams.get('stale') || undefined,
      file: searchParams.get('file') || undefined,
    };
    
    const orgId = new mongoose.Types.ObjectId(session.orgId);
    const filter = buildFilterQuery(query, orgId);
    const sort = buildSortQuery(query);
    
    const page = parseInt(query.page || '1', 10);
    const limit = Math.min(parseInt(query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;
    
    const [issues, total, stats] = await Promise.all([
      Issue.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Issue.countDocuments(filter),
      Issue.getStats(orgId),
    ]);
    
    const payload = {
      success: true,
      issues,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      stats,
    };

    return NextResponse.json({
      ...payload,
      data: payload,
    });
    
  } catch (error) {
    logger.error('GET /api/issues error:', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/issues
// ============================================================================

export async function POST(request: NextRequest) {
  // Rate limit: 30 issue creations per minute
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "issues:create",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const result = await resolveIssueSession(request);
    
    if (!result.ok) {
      return result.response;
    }
    
    const session = result.session;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const allowedRoles = ['super_admin', 'admin', 'developer'];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await connectToDatabase();
    
    const bodyResult = await parseBodySafe<CreateIssueBody>(request);
    if (bodyResult.error || !bodyResult.data) {
      return NextResponse.json({ error: bodyResult.error ?? "Invalid request body" }, { status: 400 });
    }
    const body = bodyResult.data;
    
    // Validation
    const requiredFields = ['title', 'description', 'category', 'priority', 'effort', 'location', 'module', 'action', 'definitionOfDone'];
    for (const field of requiredFields) {
      if (!body[field as keyof CreateIssueBody]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Validate enums
    if (!Object.values(IssueCategory).includes(body.category as typeof IssueCategory[keyof typeof IssueCategory])) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${Object.values(IssueCategory).join(', ')}` },
        { status: 400 }
      );
    }
    
    if (!Object.values(IssuePriority).includes(body.priority as typeof IssuePriority[keyof typeof IssuePriority])) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${Object.values(IssuePriority).join(', ')}` },
        { status: 400 }
      );
    }
    
    if (!Object.values(IssueEffort).includes(body.effort as typeof IssueEffort[keyof typeof IssueEffort])) {
      return NextResponse.json(
        { error: `Invalid effort. Must be one of: ${Object.values(IssueEffort).join(', ')}` },
        { status: 400 }
      );
    }
    
    // Check for duplicates
    const orgId = new mongoose.Types.ObjectId(session.orgId);
    const duplicates = await Issue.findDuplicates(
      orgId,
      body.location.filePath,
      body.location.lineStart
    );
    
    if (duplicates.length > 0) {
      // Update existing issue instead of creating duplicate
      const existing = duplicates[0];
      const duplicateKey = deriveIssueKey(
        body,
        String((existing as any)?.issueId || body.legacyId || 'issue')
      );
      const evidenceSnippet = (body.description || body.title).split(/\s+/).slice(0, 40).join(" ");
      const sourceHash = computeSourceHash(evidenceSnippet, body.location.filePath);
      const now = new Date();

      await Issue.findByIdAndUpdate(existing._id, {
        $inc: { mentionCount: 1 },
        $set: { 
          lastSeenAt: now,
          key: (existing as any).key || duplicateKey,
          sourcePath: body.location.filePath,
          sourceRef: body.module,
          evidenceSnippet,
          sourceHash,
        },
        $push: {
          auditEntries: {
            sessionId: `manual-${Date.now()}`,
            timestamp: now,
            findings: body.description,
          },
        },
      });
      
      return NextResponse.json({
        success: true,
        data: {
          issue: existing,
          duplicate: true,
          message: 'Existing issue updated with new mention',
        },
      });
    }
    
    // Generate identifiers
    const issueId = await Issue.generateIssueId(body.category as typeof IssueCategory[keyof typeof IssueCategory]);
    const key = deriveIssueKey(body, issueId);
    const evidenceSnippet = (body.description || body.title).split(/\s+/).slice(0, 40).join(" ");
    const sourceHash = computeSourceHash(evidenceSnippet, body.location.filePath);
    
    // Create new issue
    const issue = new Issue({
      key,
      issueId,
      externalId: body.legacyId,
      legacyId: body.legacyId,
      title: body.title,
      description: body.description,
      category: body.category,
      priority: body.priority,
      effort: body.effort,
      status: IssueStatus.OPEN,
      location: body.location,
      module: body.module,
      subModule: body.subModule,
      action: body.action,
      rootCause: body.rootCause,
      definitionOfDone: body.definitionOfDone,
      riskTags: body.riskTags || [],
      dependencies: body.dependencies || [],
      suggestedPrTitle: body.suggestedPrTitle,
      validation: body.validation,
      labels: body.labels || [],
      source: body.source || IssueSource.MANUAL,
      sourcePath: body.location.filePath,
      sourceRef: body.module,
      evidenceSnippet,
      sourceHash,
      reportedBy: session.email || session.id,
      orgId,
      sprintReady: !body.dependencies?.length,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      mentionCount: 1,
    });
    
    await issue.save();
    
    return NextResponse.json({
      success: true,
      data: { issue },
    }, { status: 201 });
    
  } catch (error) {
    logger.error('POST /api/issues error:', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
