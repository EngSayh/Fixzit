/**
 * System Health API Route Handler
 * GET /api/system/health - Get system health status from MASTER_PENDING_REPORT
 * 
 * @module app/api/system/health/route
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { getSuperadminSession } from "@/lib/superadmin/auth";

async function resolveHealthSession(request: NextRequest) {
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

const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" } as const;

interface SystemHealthResponse {
  healthScore: number;
  totalIssues: number;
  criticalIssues: number;
  highPriorityIssues: number;
  mediumPriorityIssues: number;
  lowPriorityIssues: number;
  resolvedIssues: number;
  lastUpdated: string;
  topPriorityActions: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
  }>;
}

/**
 * Parse MASTER_PENDING_REPORT.md and extract health metrics
 */
async function parseHealthReport(): Promise<SystemHealthResponse> {
  try {
    const reportPath = join(process.cwd(), "MASTER_PENDING_REPORT.md");
    const content = await readFile(reportPath, "utf-8");

    // Extract health score
    const healthScoreMatch = content.match(/\*\*Health Score\*\* \| (\d+)\/100/);
    const healthScore = healthScoreMatch ? parseInt(healthScoreMatch[1], 10) : 0;

    // Extract total issues
    const totalIssuesMatch = content.match(/\*\*Total Issues\*\* \| (\d+)/);
    const totalIssues = totalIssuesMatch ? parseInt(totalIssuesMatch[1], 10) : 0;

    // Extract issue counts by severity
    const issueCountMatch = content.match(/\| (\d+) \(🔴 (\d+) 🟠 (\d+) 🟡 (\d+) 🟢 (\d+)\)/);
    const criticalIssues = issueCountMatch ? parseInt(issueCountMatch[2], 10) : 0;
    const highPriorityIssues = issueCountMatch ? parseInt(issueCountMatch[3], 10) : 0;
    const mediumPriorityIssues = issueCountMatch ? parseInt(issueCountMatch[4], 10) : 0;
    const lowPriorityIssues = issueCountMatch ? parseInt(issueCountMatch[5], 10) : 0;

    // Extract last updated
    const lastUpdatedMatch = content.match(/\*\*Last Updated:\*\* (.+?)\n/);
    const lastUpdated = lastUpdatedMatch ? lastUpdatedMatch[1].trim() : new Date().toISOString();

    // Extract top priority actions
    const topPriorityActions: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
    }> = [];

    const prioritySection = content.match(/### 🎯 Top 5 Priority Actions\n([\s\S]*?)\n---/);
    if (prioritySection) {
      const lines = prioritySection[1].split("\n");
      for (const line of lines) {
        const match = line.match(/\d+\.\s+\[(.)\]\s+\*\*\[(.+?)\]\*\*\s+(.+)/);
        if (match) {
          const status = match[1] === "x" ? "completed" : "pending";
          const id = match[2];
          const title = match[3].trim();
          
          // Determine priority from issue ID
          let priority = "medium";
          if (id.includes("SEC-") || id.includes("CRITICAL")) priority = "critical";
          else if (id.includes("P1") || id.includes("HIGH")) priority = "high";
          else if (id.includes("P2")) priority = "medium";
          else if (id.includes("P3")) priority = "low";

          topPriorityActions.push({ id, title, status, priority });
        }
      }
    }

    // Count resolved items
    const resolvedSection = content.match(/## ✅ Resolved \(Archive\)([\s\S]*?)---/);
    let resolvedIssues = 0;
    if (resolvedSection) {
      const resolvedLines = resolvedSection[1].split("\n").filter(l => l.includes("|"));
      resolvedIssues = resolvedLines.length - 1;
    }

    return {
      healthScore,
      totalIssues,
      criticalIssues,
      highPriorityIssues,
      mediumPriorityIssues,
      lowPriorityIssues,
      resolvedIssues,
      lastUpdated,
      topPriorityActions,
    };
  } catch (error) {
    logger.error("[System Health] Error parsing MASTER_PENDING_REPORT.md", { error });
    
    return {
      healthScore: 100,
      totalIssues: 0,
      criticalIssues: 0,
      highPriorityIssues: 0,
      mediumPriorityIssues: 0,
      lowPriorityIssues: 0,
      resolvedIssues: 0,
      lastUpdated: new Date().toISOString(),
      topPriorityActions: [],
    };
  }
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "system:health",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const result = await resolveHealthSession(request);
    
    if (!result.ok) {
      return result.response;
    }
    
    const session = result.session;
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: ROBOTS_HEADER });
    }
    
    const allowedRoles = ["super_admin", "admin", "corporate_admin"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: ROBOTS_HEADER });
    }
    
    const healthData = await parseHealthReport();
    
    logger.info("[System Health] Health check requested", { 
      orgId: session.orgId, 
      healthScore: healthData.healthScore 
    });
    
    return NextResponse.json(healthData, { headers: ROBOTS_HEADER });
    
  } catch (error) {
    logger.error("[System Health] Error fetching health data", { error });
    return NextResponse.json(
      { error: "Failed to fetch system health" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
