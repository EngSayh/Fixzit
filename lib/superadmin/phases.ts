import fs from "fs";
import path from "path";

export type PhaseStatus = "completed" | "in-progress" | "not-started";

export interface PhaseEntry {
  id: string;
  title: string;
  status: PhaseStatus;
  date?: string;
  description: string;
}

export interface PhaseSummary {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionPercentage: number;
}

export interface PhaseTimelineItem {
  phase: string;
  date: string;
  status: PhaseStatus;
}

export interface PhaseData {
  phases: PhaseEntry[];
  summary: PhaseSummary;
  timeline: PhaseTimelineItem[];
  pendingItems: string[];
  lastUpdatedAt: string | null;
}

export class PendingMasterNotFoundError extends Error {
  constructor(message = "PENDING_MASTER.md not found") {
    super(message);
    this.name = "PendingMasterNotFoundError";
  }
}

export async function loadSuperadminPhaseData(): Promise<PhaseData> {
  const pendingMasterPath = path.join(process.cwd(), "docs", "PENDING_MASTER.md");

  if (!fs.existsSync(pendingMasterPath)) {
    throw new PendingMasterNotFoundError();
  }

  const content = fs.readFileSync(pendingMasterPath, "utf-8");

  const completionPattern = /✅\s*PHASES?\s+P(\d+)(?:-P(\d+))?\s+COMPLETE/gi;
  const datePattern =
    /###\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*\(([^)]+)\)\s*—\s*(?:Phase\s+)?P(\d+)(?:-P(\d+))?/g;

  const phases: PhaseEntry[] = [];

  const completedRanges: Array<{ start: number; end: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = completionPattern.exec(content)) !== null) {
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : start;
    completedRanges.push({ start, end });
  }

  const phaseEntries = new Map<number, { date: string; title: string; description: string }>();
  while ((match = datePattern.exec(content)) !== null) {
    const date = `${match[1]}T${match[2]}:00`;
    const startPhase = parseInt(match[4], 10);
    const endPhase = match[5] ? parseInt(match[5], 10) : startPhase;

    const contextStart = match.index;
    const contextEnd = content.indexOf("\n\n", contextStart);
    const context = content.slice(contextStart, contextEnd === -1 ? undefined : contextEnd);
    const titleMatch = /\*\*([^*]+)\*\*/.exec(context);
    const title = titleMatch ? titleMatch[1] : `Phase ${startPhase}-${endPhase}`;

    for (let phaseNumber = startPhase; phaseNumber <= endPhase; phaseNumber++) {
      phaseEntries.set(phaseNumber, {
        date,
        title,
        description: context.slice(0, 200),
      });
    }
  }

  for (let phaseNumber = 66; phaseNumber <= 110; phaseNumber++) {
    const isCompleted = completedRanges.some(
      (range) => phaseNumber >= range.start && phaseNumber <= range.end,
    );
    const entry = phaseEntries.get(phaseNumber);

    let status: PhaseStatus = "not-started";
    if (isCompleted) {
      status = "completed";
    } else if (phaseNumber === 107) {
      status = "in-progress";
    }

    phases.push({
      id: `P${phaseNumber}`,
      title: entry?.title || `Phase ${phaseNumber}`,
      status,
      date: isCompleted && entry?.date ? entry.date : undefined,
      description: entry?.description || "",
    });
  }

  const completed = phases.filter((phase) => phase.status === "completed").length;
  const inProgress = phases.filter((phase) => phase.status === "in-progress").length;
  const notStarted = phases.filter((phase) => phase.status === "not-started").length;
  const total = phases.length;
  const completionPercentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  const timeline = phases
    .filter((phase) => phase.status === "completed" && phase.date)
    .map((phase) => ({
      phase: phase.id,
      date: phase.date as string,
      status: phase.status,
    }))
    .slice(-10);

  // Extract pending items from MASTER_PENDING_REPORT.md
  const pendingItems: string[] = [];
  const pendingPattern = /\[ \]\s+\*\*\[([^\]]+)\]\*\*/g;
  let pendingMatch: RegExpExecArray | null;
  while ((pendingMatch = pendingPattern.exec(content)) !== null) {
    pendingItems.push(pendingMatch[1]);
  }

  // Extract last updated timestamp
  const lastUpdatedMatch = /\*\*Last Updated:\*\*\s*([^\n]+)/i.exec(content);
  const lastUpdatedAt = lastUpdatedMatch ? lastUpdatedMatch[1].trim() : null;

  return {
    phases,
    summary: {
      total,
      completed,
      inProgress,
      notStarted,
      completionPercentage,
    },
    timeline,
    pendingItems,
    lastUpdatedAt,
  };
}
