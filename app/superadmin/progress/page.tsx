import fs from "fs";
import path from "path";
import { Metadata } from "next";
import { AlertCircle, CheckCircle2, Circle, Clock, TrendingUp } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  PendingMasterNotFoundError,
  PhaseEntry,
  PhaseStatus,
  PhaseSummary,
  loadSuperadminPhaseData,
} from "@/lib/superadmin/phases";

export const metadata: Metadata = {
  title: "Phase Progress Tracker | Fixzit Superadmin",
  description: "Real-time production readiness and phase completion tracking",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface VitestStats {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
}

async function loadVitestStats(): Promise<VitestStats | null> {
  const resultsPath = path.join(process.cwd(), "vitest-results.json");
  const exists = await fs.promises
    .stat(resultsPath)
    .then(() => true)
    .catch(() => false);

  if (!exists) return null;

  const raw = await fs.promises.readFile(resultsPath, "utf-8");
  const data = JSON.parse(raw);

  return {
    totalTests: data.numTotalTests ?? 0,
    passedTests: data.numPassedTests ?? 0,
    failedTests: data.numFailedTests ?? 0,
    totalSuites: data.numTotalTestSuites ?? 0,
    passedSuites: data.numPassedTestSuites ?? 0,
    failedSuites: data.numFailedTestSuites ?? 0,
  };
}

type PhaseStatusOrDeferred = PhaseStatus | "deferred";

function getStatusIcon(status: PhaseStatusOrDeferred) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "in-progress":
      return <Clock className="h-5 w-5 text-blue-600" />;
    case "deferred":
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    default:
      return <Circle className="h-5 w-5 text-gray-400" />;
  }
}

function getStatusBadge(status: PhaseStatusOrDeferred) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="default" className="bg-green-600">
          Completed
        </Badge>
      );
    case "in-progress":
      return (
        <Badge variant="default" className="bg-blue-600">
          In Progress
        </Badge>
      );
    case "deferred":
      return <Badge variant="secondary">Deferred</Badge>;
    default:
      return <Badge variant="outline">Not Started</Badge>;
  }
}

function formatDate(date?: string) {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SuperadminProgressPage() {
  let phaseData: Awaited<ReturnType<typeof loadSuperadminPhaseData>> | null = null;
  let phaseError: string | null = null;

  try {
    phaseData = await loadSuperadminPhaseData();
  } catch (error) {
    if (error instanceof PendingMasterNotFoundError) {
      phaseError =
        "MASTER_PENDING_REPORT.md or docs/PENDING_MASTER.md missing. Update SSOT before viewing progress.";
    } else {
      phaseError = "Failed to read phase data. Check SSOT formatting.";
    }
  }

  const phases: PhaseEntry[] = phaseData?.phases ?? [];
  const summary: PhaseSummary =
    phaseData?.summary ?? {
      total: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      completionPercentage: 0,
    };
  const timeline = phaseData?.timeline ?? [];
  const pendingItems = phaseData?.pendingItems ?? [];
  const parsedAt = phaseData?.lastUpdatedAt ? formatDate(phaseData.lastUpdatedAt) : null;
  const vitestStats = await loadVitestStats();
  const lastUpdated = timeline.length > 0 ? formatDate(timeline[timeline.length - 1].date) : null;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Phase Progress Tracker</h1>
        <p className="text-muted-foreground">
          Live progress parsed from MASTER_PENDING_REPORT.md (SSOT) with PENDING_MASTER fallback
        </p>
      </div>

      {phaseError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Phase data unavailable</AlertTitle>
          <AlertDescription>{phaseError}</AlertDescription>
        </Alert>
      ) : null}

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Overall Progress
          </CardTitle>
          <CardDescription>
            {summary.completed} of {summary.total} phases completed ({summary.completionPercentage}%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={summary.completionPercentage} className="h-4" />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium">Completed</div>
              <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
            </div>
            <div>
              <div className="font-medium">In Progress</div>
              <div className="text-2xl font-bold text-blue-600">{summary.inProgress}</div>
            </div>
            <div>
              <div className="font-medium">Not Started</div>
              <div className="text-2xl font-bold text-yellow-600">{summary.notStarted}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SSOT Status */}
      <Card>
        <CardHeader>
          <CardTitle>SSOT Status</CardTitle>
          <CardDescription>Pending items and last parsed timestamp</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium">Last Parsed</div>
              <div className="text-2xl font-bold text-blue-600">
                {parsedAt || lastUpdated || "Pending"}
              </div>
            </div>
            <div>
              <div className="font-medium">Pending Items</div>
              <div className="text-2xl font-bold text-yellow-600">
                {pendingItems.length}
              </div>
            </div>
          </div>
          {pendingItems.length > 0 ? (
            <ul className="space-y-2 text-sm text-muted-foreground">
              {pendingItems.map((item: string) => (
                <li key={item} className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-yellow-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No pending items detected.</p>
          )}
        </CardContent>
      </Card>

      {/* Production Readiness */}
      <Card>
        <CardHeader>
          <CardTitle>Production Readiness</CardTitle>
          <CardDescription>Derived from SSOT phase tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-6xl font-bold text-green-600">{summary.completionPercentage}%</div>
              <div className="text-sm text-muted-foreground mt-2">Completion across tracked phases</div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Completed</span>
                  <span className="text-muted-foreground">{summary.completed}</span>
                </div>
                <Progress
                  value={summary.total ? (summary.completed / summary.total) * 100 : 0}
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">In Progress</span>
                  <span className="text-muted-foreground">{summary.inProgress}</span>
                </div>
                <Progress
                  value={summary.total ? (summary.inProgress / summary.total) * 100 : 0}
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Not Started</span>
                  <span className="text-muted-foreground">{summary.notStarted}</span>
                </div>
                <Progress
                  value={summary.total ? (summary.notStarted / summary.total) * 100 : 0}
                  className="h-2"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Test Coverage</CardTitle>
          <CardDescription>Latest vitest snapshot (vitest-results.json)</CardDescription>
        </CardHeader>
        <CardContent>
          {vitestStats ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Tests</span>
                  <span className="text-muted-foreground">
                    {vitestStats.passedTests}/{vitestStats.totalTests} passing
                  </span>
                </div>
                <Progress
                  value={
                    vitestStats.totalTests
                      ? (vitestStats.passedTests / vitestStats.totalTests) * 100
                      : 0
                  }
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Suites</span>
                  <span className="text-muted-foreground">
                    {vitestStats.passedSuites}/{vitestStats.totalSuites} passing
                  </span>
                </div>
                <Progress
                  value={
                    vitestStats.totalSuites
                      ? (vitestStats.passedSuites / vitestStats.totalSuites) * 100
                      : 0
                  }
                  className="h-2"
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No vitest-results.json detected. Run
              {" `pnpm vitest run --reporter=json --outputFile=vitest-results.json` "}
              to refresh this widget after CI/test execution.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Phase Tracking</CardTitle>
          <CardDescription>Parsed live from SSOT phase ledger</CardDescription>
        </CardHeader>
        <CardContent>
          {phases.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No phases detected. Ensure docs/PENDING_MASTER.md lists completed ranges (e.g., "✅ PHASE P80-P85 COMPLETE").
            </p>
          ) : (
            <div className="space-y-3">
              {phases.map((phase) => (
                <div
                  key={phase.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-0.5">{getStatusIcon(phase.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-medium">{phase.id}</span>
                      <span className="font-medium">{phase.title}</span>
                      {getStatusBadge(phase.status)}
                    </div>
                    {phase.description ? (
                      <p className="text-sm text-muted-foreground line-clamp-2">{phase.description}</p>
                    ) : null}
                    {formatDate(phase.date) ? (
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(phase.date)}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed Phases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{summary.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">Updated from SSOT</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{summary.inProgress}</div>
            <p className="text-xs text-muted-foreground mt-1">Active phases</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Not Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{summary.notStarted}</div>
            <p className="text-xs text-muted-foreground mt-1">Queued phases</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {parsedAt || lastUpdated || "Pending"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Based on latest completed phase</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
