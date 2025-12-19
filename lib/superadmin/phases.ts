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
  constructor(message = "Pending report not found") {
    super(message);
    this.name = "PendingMasterNotFoundError";
  }
}

export async function loadSuperadminPhaseData(): Promise<PhaseData> {
  const masterReportPath = path.join(process.cwd(), "MASTER_PENDING_REPORT.md");
  const pendingMasterPath = path.join(process.cwd(), "docs", "PENDING_MASTER.md");

  const pendingMasterContent = fs.existsSync(pendingMasterPath)
    ? fs.readFileSync(pendingMasterPath, "utf-8")
    : null;
  const masterReportContent = fs.existsSync(masterReportPath)
    ? fs.readFileSync(masterReportPath, "utf-8")
    : null;

  if (!pendingMasterContent && !masterReportContent) {
    throw new PendingMasterNotFoundError();
  }

  const phaseSourceContent = pendingMasterContent ?? masterReportContent ?? "";

  const completionPattern = /✅\s*PHASES?\s+P(\d+)(?:-P(\d+))?\s+COMPLETE/gi;
  const datePattern =
    /###\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*\(([^)]+)\)\s*—\s*(?:Phase\s+)?P(\d+)(?:-P(\d+))?/g;

  const phases: PhaseEntry[] = [];

  const completedRanges: Array<{ start: number; end: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = completionPattern.exec(phaseSourceContent)) !== null) {
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : start;
    completedRanges.push({ start, end });
  }

  const phaseEntries = new Map<
    number,
    { date?: string; title: string; description: string; status?: PhaseStatus }
  >();
  while ((match = datePattern.exec(phaseSourceContent)) !== null) {
    const date = `${match[1]}T${match[2]}:00`;
    const startPhase = parseInt(match[4], 10);
    const endPhase = match[5] ? parseInt(match[5], 10) : startPhase;

    const contextStart = match.index;
    const contextEnd = phaseSourceContent.indexOf("\n\n", contextStart);
    const context = phaseSourceContent.slice(
      contextStart,
      contextEnd === -1 ? undefined : contextEnd,
    );
    const titleMatch = /\*\*([^*]+)\*\*/.exec(context);
    const title = titleMatch ? titleMatch[1] : `Phase ${startPhase}-${endPhase}`;

    for (let phaseNumber = startPhase; phaseNumber <= endPhase; phaseNumber++) {
      phaseEntries.set(phaseNumber, {
        date,
        title,
        description: context.slice(0, 200),
        status: "completed",
      });
    }
  }

  if (masterReportContent) {
    const resolvedSectionPattern =
      /###\s*✅\s*(?:Current Session|Recently Resolved)[\s\S]*?(?=###|## |\n---|$)/gi;
    const phaseLinePattern = /(\d+)\.\s*\*\*\[P(\d+)\]\*\*\s*(✅|🔄|⏳)\s*([^-\n]+)/g;
    let sectionMatch: RegExpExecArray | null;
    while ((sectionMatch = resolvedSectionPattern.exec(masterReportContent)) !== null) {
      const sectionText = sectionMatch[0];
      let lineMatch: RegExpExecArray | null;
      const localPattern = new RegExp(phaseLinePattern.source, "g");
      while ((lineMatch = localPattern.exec(sectionText)) !== null) {
        const phaseNumber = parseInt(lineMatch[2], 10);
        const statusEmoji = lineMatch[3];
        const title = lineMatch[4].trim();
        const status: PhaseStatus = statusEmoji === "✅" ? "completed" : "in-progress";
        phaseEntries.set(phaseNumber, {
          date: phaseEntries.get(phaseNumber)?.date,
          title,
          description: `Phase ${phaseNumber}: ${title}`,
          status,
        });
      }
    }
  }

  const foundPhases = Array.from(phaseEntries.keys());
  const minPhase = foundPhases.length > 0 ? Math.min(...foundPhases, 66) : 66;
  const maxPhase = foundPhases.length > 0 ? Math.max(...foundPhases, 110) : 110;

  for (let phaseNumber = minPhase; phaseNumber <= maxPhase; phaseNumber++) {
    const isCompleted = completedRanges.some(
      (range) => phaseNumber >= range.start && phaseNumber <= range.end,
    );
    const entry = phaseEntries.get(phaseNumber);

    let status: PhaseStatus = entry?.status ?? "not-started";
    if (isCompleted) {
      status = "completed";
    }

    phases.push({
      id: `P${phaseNumber}`,
      title: entry?.title || `Phase ${phaseNumber}`,
      status,
      date: status === "completed" ? entry?.date : undefined,
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

  // Extract pending items (SSOT preferred)
  const pendingItems: string[] = [];
  const pendingSource = masterReportContent ?? pendingMasterContent ?? "";
  const pendingPattern = /\[ \]\s+\*\*\[([^\]]+)\]\*\*/g;
  let pendingMatch: RegExpExecArray | null;
  while ((pendingMatch = pendingPattern.exec(pendingSource)) !== null) {
    pendingItems.push(pendingMatch[1].trim());
  }

  if (masterReportContent) {
    const pendingSectionMatch =
      /###\s*⏳\s*Pending[\s\S]*?(?=\n###|\n## |\n---|$)/i.exec(masterReportContent);
    const pendingSection = pendingSectionMatch ? pendingSectionMatch[0] : "";
    const pendingLinePattern = /^\s*\d+\.\s+\*\*\[([^\]]+)\]\*\*\s+([^\n]+)/gm;
    let pendingLineMatch: RegExpExecArray | null;
    while ((pendingLineMatch = pendingLinePattern.exec(pendingSection)) !== null) {
      const id = pendingLineMatch[1].trim();
      const title = pendingLineMatch[2].trim().replace(/^⏳\s*/, "");
      pendingItems.push(`${id}: ${title}`);
    }

    const pendingBulletPattern = /^\s*-\s+([^\n]+)/gm;
    let pendingBulletMatch: RegExpExecArray | null;
    while ((pendingBulletMatch = pendingBulletPattern.exec(pendingSection)) !== null) {
      pendingItems.push(pendingBulletMatch[1].trim());
    }
  }

  // Extract last updated timestamp (SSOT -> PENDING_MASTER fallback)
  const lastUpdatedMatch = masterReportContent
    ? /\*\*Last Updated:\*\*\s*([^\n]+)/i.exec(masterReportContent)
    : null;
  const pendingMasterUpdatedMatch = pendingMasterContent
    ? /\*\*Last Updated:\*\*\s*([^\n]+)/i.exec(pendingMasterContent)
    : null;
  const lastUpdatedRaw = lastUpdatedMatch
    ? lastUpdatedMatch[1].trim()
    : pendingMasterUpdatedMatch
      ? pendingMasterUpdatedMatch[1].trim()
      : null;
  const lastUpdatedAt = lastUpdatedRaw ? lastUpdatedRaw.split(" (")[0].trim() : null;

  const uniquePendingItems = Array.from(new Set(pendingItems));

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
    pendingItems: uniquePendingItems,
    lastUpdatedAt,
  };
}
