/**
 * Centralized phase data parser for superadmin progress tracking
 * Reads from SSOT (docs/PENDING_MASTER.md) and provides structured phase data
 */

import fs from "fs";
import path from "path";
import { logger } from "@/lib/logger";

export class PendingMasterNotFoundError extends Error {
  constructor(message = "PENDING_MASTER.md not found") {
    super(message);
    this.name = "PendingMasterNotFoundError";
  }
}

export interface PhaseTask {
  id: string;
  name: string;
  status: "completed" | "in-progress" | "pending" | "deferred";
  commit?: string;
  priority: "P0" | "P1" | "P2" | "P3";
}

export interface Phase {
  id: string;
  name: string;
  description: string;
  status: "completed" | "in-progress" | "pending";
  progress: number;
  tasks: PhaseTask[];
}

export interface PhaseSummary {
  totalTasks: number;
  completedTasks: number;
  overallProgress: number;
  completedPhases: number;
  inProgressPhases: number;
  pendingPhases: number;
}

/**
 * Parse phases from PENDING_MASTER.md
 * Uses synchronous FS reads for API route compatibility
 */
export function parsePhasesFromPendingMaster(): Phase[] {
  const pendingMasterPath = path.join(process.cwd(), "docs", "PENDING_MASTER.md");

  // Use synchronous check for API route compatibility
  if (!fs.existsSync(pendingMasterPath)) {
    throw new PendingMasterNotFoundError();
  }

  const content = fs.readFileSync(pendingMasterPath, "utf-8");

  // Parse the markdown content to extract phases
  // This is a simplified parser - adjust based on actual PENDING_MASTER.md format
  const phases: Phase[] = [];
  
  // Look for phase sections (e.g., "**1. Design Tokens System** ✅ COMPLETE")
  const phasePattern = /\*\*(\d+)\.\s+([^*]+)\*\*\s+(✅\s+COMPLETE|⏳\s+IN PROGRESS|📋\s+PENDING)?/g;
  let match;
  let currentPhaseId = 0;

  while ((match = phasePattern.exec(content)) !== null) {
    currentPhaseId++;
    const phaseName = match[2].trim();
    const statusMarker = match[3] || "";
    
    let status: Phase["status"] = "pending";
    let progress = 0;
    
    if (statusMarker.includes("COMPLETE")) {
      status = "completed";
      progress = 100;
    } else if (statusMarker.includes("IN PROGRESS")) {
      status = "in-progress";
      progress = 50; // Default to 50% for in-progress
    }

    phases.push({
      id: `phase-${currentPhaseId}`,
      name: `Phase ${currentPhaseId}: ${phaseName}`,
      description: phaseName,
      status,
      progress,
      tasks: [] // Tasks will be extracted separately if needed
    });
  }

  // If no phases found in PENDING_MASTER, return fallback hard-coded phases
  // This ensures the dashboard doesn't break if PENDING_MASTER format changes
  if (phases.length === 0) {
    logger.warn("No phases parsed from PENDING_MASTER.md, using fallback data");
    return getFallbackPhases();
  }

  return phases;
}

/**
 * Get fallback phases (original hard-coded data)
 * Used when PENDING_MASTER.md is missing or unparseable
 */
function getFallbackPhases(): Phase[] {
  return [
    {
      id: "phase-0",
      name: "Phase 0: Initial Setup",
      description: "I18n compliance, OpenAPI documentation, audit setup",
      status: "completed",
      progress: 100,
      tasks: [
        { id: "p0-i18n", name: "I18n compliance - 27 translations (EN + AR)", status: "completed", commit: "934175a", priority: "P0" },
        { id: "p0-openapi", name: "OpenAPI spec fragment creation", status: "completed", commit: "05413a0", priority: "P1" },
        { id: "p0-audit", name: "Comprehensive audit report", status: "completed", commit: "05413a0", priority: "P1" },
      ],
    },
    {
      id: "phase-1",
      name: "Phase 1: Security Enhancements",
      description: "Rate limiting for impersonation endpoints",
      status: "completed",
      progress: 100,
      tasks: [
        { id: "p1-rate-limit-impersonate", name: "Rate limiting - POST /impersonate (10 req/min)", status: "completed", commit: "329088d", priority: "P2" },
        { id: "p1-rate-limit-search", name: "Rate limiting - GET /organizations/search (20 req/min)", status: "completed", commit: "329088d", priority: "P2" },
        { id: "p1-rate-limit-tests", name: "Rate limit test coverage", status: "completed", commit: "329088d", priority: "P2" },
      ],
    },
    {
      id: "phase-2",
      name: "Phase 2: Testing & Quality",
      description: "Comprehensive component test coverage",
      status: "completed",
      progress: 100,
      tasks: [
        { id: "p2-form-tests", name: "ImpersonationForm tests (20 test cases)", status: "completed", commit: "efb8e4d", priority: "P2" },
        { id: "p2-banner-tests", name: "ImpersonationBanner tests (18 test cases)", status: "completed", commit: "efb8e4d", priority: "P2" },
      ],
    },
    {
      id: "phase-3",
      name: "Phase 3: Performance Optimization",
      description: "Redis caching for organization search",
      status: "completed",
      progress: 100,
      tasks: [
        { id: "p3-redis-cache", name: "Redis caching (5-min TTL, 95%+ latency reduction)", status: "completed", commit: "69cfc87", priority: "P2" },
      ],
    },
    {
      id: "phase-4",
      name: "Phase 4: Accessibility",
      description: "WCAG 2.1 Level AA compliance",
      status: "completed",
      progress: 100,
      tasks: [
        { id: "p4-aria", name: "ARIA labels for all interactive elements", status: "completed", commit: "2195464", priority: "P3" },
        { id: "p4-focus", name: "Focus management (auto-focus, context-aware)", status: "completed", commit: "2195464", priority: "P3" },
      ],
    },
    {
      id: "phase-5",
      name: "Phase 5: Security Hardening",
      description: "IPv6 SSRF protection and DNS rebinding",
      status: "in-progress",
      progress: 50,
      tasks: [
        { id: "p5-ipv6", name: "IPv6 SSRF protection (fc00::/7, fd00::/8, fe80::/10)", status: "completed", commit: "ffe823e", priority: "P3" },
        { id: "p5-dns", name: "DNS rebinding protection", status: "deferred", priority: "P3" },
      ],
    },
    {
      id: "phase-6",
      name: "Phase 6: Documentation Integration",
      description: "OpenAPI spec merge and finalization",
      status: "pending",
      progress: 0,
      tasks: [
        { id: "p6-openapi-merge", name: "Merge OpenAPI fragment into main spec", status: "pending", priority: "P1" },
      ],
    },
    {
      id: "phase-7",
      name: "Phase 7: Memory Optimization",
      description: "VSCode and system memory optimization",
      status: "pending",
      progress: 0,
      tasks: [
        { id: "p7-vscode", name: "VSCode memory settings optimization", status: "pending", priority: "P3" },
        { id: "p7-nextjs", name: "Next.js build optimization", status: "pending", priority: "P3" },
        { id: "p7-typescript", name: "TypeScript configuration optimization", status: "pending", priority: "P3" },
      ],
    },
  ];
}

/**
 * Calculate summary statistics from phases
 */
export function calculatePhaseSummary(phases: Phase[]): PhaseSummary {
  const totalTasks = phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
  const completedTasks = phases.reduce(
    (sum, phase) => sum + phase.tasks.filter((t) => t.status === "completed").length,
    0
  );
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const completedPhases = phases.filter((p) => p.status === "completed").length;
  const inProgressPhases = phases.filter((p) => p.status === "in-progress").length;
  const pendingPhases = phases.filter((p) => p.status === "pending").length;

  return {
    totalTasks,
    completedTasks,
    overallProgress,
    completedPhases,
    inProgressPhases,
    pendingPhases,
  };
}

/**
 * Load phases with error handling and fallback
 * Returns phases and a flag indicating if SSOT was available
 */
export function loadPhases(): { phases: Phase[]; usedFallback: boolean } {
  try {
    const phases = parsePhasesFromPendingMaster();
    return { phases, usedFallback: phases.length === 0 };
  } catch (error) {
    if (error instanceof PendingMasterNotFoundError) {
      logger.warn("PENDING_MASTER.md not found, using fallback phase data");
      return { phases: getFallbackPhases(), usedFallback: true };
    }
    logger.error("Error parsing phases", { error });
    return { phases: getFallbackPhases(), usedFallback: true };
  }
}
