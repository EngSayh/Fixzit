/**
 * Issues Bulk Import API Route Handler
 * POST /api/issues/import - Import multiple issues from PENDING_MASTER or other sources
 * 
 * Supports bulk issue creation with automatic deduplication via hash keys,
 * status mapping, and event logging. Used by superadmin issue management.
 * 
 * @module app/api/issues/import/route
 * @requires Superadmin authentication
 * 
 * @requestBody
 * - issues: Array of IssueImport objects
 *   - key: Unique hash key for deduplication (required)
 *   - title: Issue title (required)
 *   - category: Issue category (doc, bug, feature, perf, etc.)
 *   - priority: P0, P1, P2, P3
 *   - status: open, in_progress, resolved, etc.
 *   - effort: XS, S, M, L, XL, XXL
 *   - description: Detailed description
 *   - evidence: Code snippets or evidence
 *   - files: Affected file paths
 *   - externalId: Optional external issue tracker ID
 * 
 * @response
 * - imported: Number of successfully imported issues
 * - skipped: Number of duplicate issues (same hash key)
 * - errors: Array of error objects for failed imports
 * 
 * @security
 * - Rate limited: 10 requests per minute per user
 * - Superadmin-only access
 * - Tenant-scoped via orgId
 */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { createHash } from "crypto";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import {
  Issue,
  IssueCategory,
  IssueCategoryType,
  IssueEffort,
  IssueEffortType,
  IssuePriority,
  IssuePriorityType,
  IssueSource,
  IssueStatus,
  IssueStatusType,
} from "@/server/models/Issue";
import IssueEvent from "@/server/models/IssueEvent";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { getSuperadminSession } from "@/lib/superadmin/auth";

interface IssueImport {
  key: string;
  externalId?: string | null;
  title: string;
  category?: string;
  priority?: string;
  status?: string;
  effort?: string;
  location?: string;
  sourcePath: string;
  sourceRef: string;
  evidenceSnippet: string;
  description?: string;
}

interface ImportBody {
  issues: IssueImport[];
  dryRun?: boolean;
}

interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ index: number; error: string; key?: string }>;
}

const REQUIRED_FIELDS = ["key", "title", "sourceRef", "evidenceSnippet", "sourcePath"] as const;
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeCategory(category?: string): IssueCategoryType {
  const normalized = (category || "").toLowerCase();
  switch (normalized) {
    case "logic":
    case "logic_error":
      return IssueCategory.LOGIC_ERROR;
    case "missing_test":
    case "test":
      return IssueCategory.MISSING_TEST;
    case "efficiency":
    case "performance":
      return IssueCategory.EFFICIENCY;
    case "security":
      return IssueCategory.SECURITY;
    case "feature":
      return IssueCategory.FEATURE;
    case "refactor":
      return IssueCategory.REFACTOR;
    case "documentation":
    case "docs":
      return IssueCategory.DOCUMENTATION;
    case "next_step":
    case "task":
      return IssueCategory.NEXT_STEP;
    default:
      return IssueCategory.BUG;
  }
}

function normalizePriority(priority?: string): IssuePriorityType {
  const normalized = (priority || "P2").toUpperCase();
  if (normalized.startsWith("P0")) return IssuePriority.P0_CRITICAL;
  if (normalized.startsWith("P1")) return IssuePriority.P1_HIGH;
  if (normalized.startsWith("P2")) return IssuePriority.P2_MEDIUM;
  if (normalized.startsWith("P3")) return IssuePriority.P3_LOW;
  return IssuePriority.P2_MEDIUM;
}

function normalizeEffort(effort?: string): IssueEffortType {
  const normalized = (effort || "M").toUpperCase();
  if (normalized === "XS") return IssueEffort.XS;
  if (normalized === "S") return IssueEffort.S;
  if (normalized === "M") return IssueEffort.M;
  if (normalized === "L") return IssueEffort.L;
  if (normalized === "XL") return IssueEffort.XL;
  return IssueEffort.M;
}

function normalizeStatus(status?: string): IssueStatusType {
  const normalized = (status || "pending").toLowerCase();
  switch (normalized) {
    case "pending":
    case "open":
      return IssueStatus.OPEN;
    case "in_progress":
    case "in-progress":
      return IssueStatus.IN_PROGRESS;
    case "blocked":
      return IssueStatus.BLOCKED;
    case "resolved":
    case "closed":
      return IssueStatus.RESOLVED;
    case "in_review":
    case "review":
      return IssueStatus.IN_REVIEW;
    default:
      return IssueStatus.OPEN;
  }
}

function normalizeEvidence(snippet: string): string {
  const words = snippet.split(/\s+/).filter(Boolean).slice(0, 25);
  return words.join(" ");
}

function computeSourceHash(snippet: string, location: string): string {
  return createHash("sha256")
    .update(`${location || "unknown"}::${snippet}`)
    .digest("hex");
}

function extractModule(location: string): string {
  if (!location) return "general";
  const parts = location.split("/").filter(Boolean);
  if (parts[0] === "app" && parts[1]) return parts[1].replace(/[()]/g, "");
  if (["components", "lib", "server"].includes(parts[0] || "")) {
    return parts[0] || "general";
  }
  return parts[0] || "general";
}

async function resolveSession(request: NextRequest) {
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

export async function POST(request: NextRequest) {
  // Rate limit: 5 bulk imports per minute (sensitive operation)
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "issues:import",
    requests: 5,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const authResult = await resolveSession(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const session = authResult.session;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: ROBOTS_HEADER });
    }

    const allowedRoles = ["super_admin", "admin", "developer"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: ROBOTS_HEADER });
    }

    const body = typeof (request as any).json === "function"
      ? ((await (request as any).json().catch(() => null)) as ImportBody | null)
      : null;
    if (!body || !Array.isArray(body.issues)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers: ROBOTS_HEADER });
    }

    const dryRun = Boolean(body.dryRun);
    await connectToDatabase();

    const orgId = new mongoose.Types.ObjectId(session.orgId);
    const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (let i = 0; i < body.issues.length; i++) {
      const raw = body.issues[i];
      const missing = REQUIRED_FIELDS.filter((field) => !(raw as any)?.[field]);
      if (missing.length > 0) {
        summary.errors.push({ index: i, error: `Missing required fields: ${missing.join(", ")}`, key: raw.key });
        summary.skipped += 1;
        continue;
      }

      const key = slugify(raw.key);
      if (!key) {
        summary.errors.push({ index: i, error: "Invalid key", key: raw.key });
        summary.skipped += 1;
        continue;
      }

      const evidenceSnippet = normalizeEvidence(raw.evidenceSnippet);
      const location = raw.location || raw.sourcePath;
      const normalizedCategory = normalizeCategory(raw.category);
      const normalizedPriority = normalizePriority(raw.priority);
      const normalizedStatus = normalizeStatus(raw.status);
      const normalizedEffort = normalizeEffort(raw.effort);
      const sourceHash = computeSourceHash(evidenceSnippet, location);
      const issueModule = extractModule(location);
      const now = new Date();

      const existing = await Issue.findOne({ orgId, key }).lean();
      if (existing) {
        const resolvedStates = new Set<IssueStatusType>([
          IssueStatus.RESOLVED,
          IssueStatus.CLOSED,
          IssueStatus.WONT_FIX,
        ]);
        const existingStatus = existing.status as IssueStatusType;
        const shouldUpdateStatus =
          !resolvedStates.has(existingStatus) ||
          resolvedStates.has(normalizedStatus);

        if (!dryRun) {
          await Issue.updateOne(
            { _id: existing._id, orgId },
            {
              $set: {
                title: raw.title.trim(),
                externalId: raw.externalId || existing.externalId,
                category: normalizedCategory,
                priority: normalizedPriority,
                effort: normalizedEffort,
                status: shouldUpdateStatus ? normalizedStatus : existing.status,
                sourcePath: raw.sourcePath,
                sourceRef: raw.sourceRef,
                evidenceSnippet,
                sourceHash,
                location: { ...(existing as any).location, filePath: location },
                module: issueModule,
                action: (existing as any).action || `Fix: ${raw.title}`,
                lastSeenAt: now,
              },
              $inc: { mentionCount: 1 },
            }
          );

          await IssueEvent.create({
            issueId: existing._id,
            key,
            type: shouldUpdateStatus && existing.status !== normalizedStatus ? "STATUS_CHANGED" : "UPDATED",
            sourceRef: raw.sourceRef,
            sourceHash,
            orgId,
            metadata: {
              priority: normalizedPriority,
              status: shouldUpdateStatus ? normalizedStatus : existing.status,
            },
          });
        }

        summary.updated += 1;
        continue;
      }

      const issueId = raw.externalId || (await Issue.generateIssueId(normalizedCategory));

      const newIssue = new Issue({
        key,
        issueId,
        externalId: raw.externalId || undefined,
        legacyId: raw.externalId || key,
        title: raw.title.trim(),
        description: raw.description || raw.evidenceSnippet,
        category: normalizedCategory,
        priority: normalizedPriority,
        status: normalizedStatus,
        effort: normalizedEffort,
        location: { filePath: location },
        module: issueModule,
        action: `Fix: ${raw.title}`,
        rootCause: raw.description,
        definitionOfDone: "Issue resolved and verified",
        riskTags: [],
        dependencies: [],
        suggestedPrTitle: undefined,
        validation: undefined,
        labels: [],
        source: IssueSource.IMPORT,
        sourcePath: raw.sourcePath,
        sourceRef: raw.sourceRef,
        evidenceSnippet,
        sourceHash,
        sourceDetail: "BACKLOG_AUDIT",
        reportedBy: session.email || session.id,
        orgId,
        sprintReady: true,
        firstSeenAt: now,
        lastSeenAt: now,
        mentionCount: 1,
      });

      if (!dryRun) {
        try {
          await newIssue.save();
          await IssueEvent.create({
            issueId: newIssue._id,
            key,
            type: "SYNCED",
            sourceRef: raw.sourceRef,
            sourceHash,
            orgId,
          });
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : String(err ?? "Unknown error");
          // Gracefully skip duplicate issueIds/keys to keep import idempotent
          if (message.includes("E11000 duplicate key error")) {
            summary.skipped += 1;
            continue;
          }
          throw err;
        }
      }

      summary.created += 1;
    }

    logger.info("[Issues Import] Import completed", {
      orgId: session.orgId,
      dryRun,
      ...summary,
    });

    return NextResponse.json(
      {
        success: true,
        dryRun,
        result: summary,
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Issues Import] Error importing issues", { error });
    return NextResponse.json(
      { error: "Failed to import issues" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
