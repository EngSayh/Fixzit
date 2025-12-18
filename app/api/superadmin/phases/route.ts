/**
 * Super Admin - Phase Progress Tracking API
 * Real-time P0-P75 phase status from PENDING_MASTER.md
 * 
 * @module app/api/superadmin/phases/route
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import fs from "fs";
import path from "path";

/**
 * GET /api/superadmin/phases
 * Returns phase progress statistics and timeline
 * 
 * @auth SuperAdmin only
 * @returns {
 *   phases: Array<{
 *     id: string, // "P66", "P67", etc.
 *     title: string,
 *     status: "completed" | "in-progress" | "not-started",
 *     date?: string, // ISO 8601 completion date
 *     duration?: number, // minutes
 *     description: string
 *   }>,
 *   summary: {
 *     total: number,
 *     completed: number,
 *     inProgress: number,
 *     notStarted: number,
 *     completionPercentage: number
 *   },
 *   timeline: Array<{
 *     phase: string,
 *     date: string,
 *     status: string
 *   }>
 * }
 */
export async function GET(req: NextRequest) {
  // Auth check
  const session = await getSuperadminSession(req);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Parse PENDING_MASTER.md for phase entries
    const pendingMasterPath = path.join(process.cwd(), "docs", "PENDING_MASTER.md");
    
    if (!fs.existsSync(pendingMasterPath)) {
      return NextResponse.json({ error: "PENDING_MASTER.md not found" }, { status: 404 });
    }

    const content = fs.readFileSync(pendingMasterPath, "utf-8");
    
    // Extract phase entries (P66-P75 from latest execution)
    const completionPattern = /✅\s*PHASES?\s+P(\d+)(?:-P(\d+))?\s+COMPLETE/gi;
    const datePattern = /###\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*\(([^)]+)\)\s*—\s*(?:Phase\s+)?P(\d+)(?:-P(\d+))?/g;
    
    const phases: Array<{
      id: string;
      title: string;
      status: "completed" | "in-progress" | "not-started";
      date?: string;
      duration?: number;
      description: string;
    }> = [];

    // Extract completed phase ranges
    const completedRanges: Array<{ start: number; end: number }> = [];
    let match;
    while ((match = completionPattern.exec(content)) !== null) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : start;
      completedRanges.push({ start, end });
    }

    // Extract phase entries with dates
    const phaseEntries = new Map<number, { date: string; title: string; description: string }>();
    while ((match = datePattern.exec(content)) !== null) {
      const date = `${match[1]}T${match[2]}:00`;
      const startPhase = parseInt(match[4], 10);
      const endPhase = match[5] ? parseInt(match[5], 10) : startPhase;
      
      // Read next few lines for title/description
      const contextStart = match.index;
      const contextEnd = content.indexOf("\n\n", contextStart);
      const context = content.slice(contextStart, contextEnd);
      const titleMatch = /\*\*([^*]+)\*\*/.exec(context);
      const title = titleMatch ? titleMatch[1] : `Phase ${startPhase}-${endPhase}`;
      
      for (let p = startPhase; p <= endPhase; p++) {
        phaseEntries.set(p, { date, title, description: context.slice(0, 200) });
      }
    }

    // Current phases (P66-P97: production readiness + final polish)
    // P66-P75: Core production readiness
    // P76-P83: Production audit + polish
    // P84-P88: Audit documentation
    // P89-P97: Final enhancement + PR creation
    for (let i = 66; i <= 97; i++) {
      const isCompleted = completedRanges.some(r => i >= r.start && i <= r.end);
      const entry = phaseEntries.get(i);
      
      // Determine in-progress status based on surrounding completion
      let status: "completed" | "in-progress" | "not-started" = "not-started";
      if (isCompleted) {
        status = "completed";
      } else if (i === 97) {
        status = "in-progress"; // Current phase
      }
      
      phases.push({
        id: `P${i}`,
        title: entry?.title || `Phase ${i}`,
        status,
        date: isCompleted && entry?.date ? entry.date : undefined,
        description: entry?.description || "",
      });
    }

    // Compute summary
    const completed = phases.filter(p => p.status === "completed").length;
    const inProgress = phases.filter(p => p.status === "in-progress").length;
    const notStarted = phases.filter(p => p.status === "not-started").length;
    const total = phases.length;
    const completionPercentage = Math.round((completed / total) * 100);

    // Timeline (last 10 completed phases)
    const timeline = phases
      .filter(p => p.status === "completed" && p.date)
      .map(p => ({
        phase: p.id,
        date: p.date!,
        status: p.status,
      }))
      .slice(-10);

    return NextResponse.json(
      {
        phases,
        summary: {
          total,
          completed,
          inProgress,
          notStarted,
          completionPercentage,
        },
        timeline,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    logger.error("[SuperAdmin Phases API] Error:", error);
    return NextResponse.json(
      { error: "Failed to parse phase data" },
      { status: 500 }
    );
  }
}
