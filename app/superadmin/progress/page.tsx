/**
 * Superadmin Progress Dashboard
 * Displays implementation progress for all phases of the impersonation enhancement project
 * Now reads from SSOT (docs/PENDING_MASTER.md) via centralized parser
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Clock, AlertCircle, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import type { Phase, PhaseTask, PhaseSummary } from "@/lib/superadmin/phases";

interface DashboardData {
  phases: Phase[];
  summary: PhaseSummary;
  usedFallback: boolean;
  error?: string;
}

const getStatusIcon = (status: Phase["status"]) => {
  switch (status) {
    case "completed": return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    case "in-progress": return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
    case "pending": return <Circle className="w-5 h-5 text-gray-400" />;
  }
};

const getTaskStatusIcon = (status: PhaseTask["status"]) => {
  switch (status) {
    case "completed": return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case "in-progress": return <Clock className="w-4 h-4 text-blue-600" />;
    case "deferred": return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    case "pending": return <Circle className="w-4 h-4 text-gray-400" />;
  }
};

const getStatusBadge = (status: Phase["status"]) => {
  switch (status) {
    case "completed": return <Badge variant="default" className="bg-green-600">Completed</Badge>;
    case "in-progress": return <Badge variant="default" className="bg-blue-600">In Progress</Badge>;
    case "pending": return <Badge variant="secondary">Pending</Badge>;
  }
};

const getPriorityColor = (priority: PhaseTask["priority"]) => {
  switch (priority) {
    case "P0": return "text-red-600 font-bold";
    case "P1": return "text-orange-600 font-semibold";
    case "P2": return "text-yellow-600";
    case "P3": return "text-gray-600";
  }
};

export default function ProgressDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/superadmin/progress");
        if (!response.ok) {
          throw new Error(`Failed to fetch progress data: ${response.statusText}`);
        }
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error loading progress data:", error);
        setData({
          phases: [],
          summary: {
            totalTasks: 0,
            completedTasks: 0,
            overallProgress: 0,
            completedPhases: 0,
            inProgressPhases: 0,
            pendingPhases: 0,
          },
          usedFallback: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Impersonation Enhancement Progress</h1>
          <p className="text-muted-foreground">Loading progress data...</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Impersonation Enhancement Progress</h1>
          <p className="text-muted-foreground">Error loading progress data</p>
        </div>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-100">Failed to load progress data</p>
                <p className="text-sm text-red-700 dark:text-red-300">{data?.error || "Unknown error occurred"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { phases, summary, usedFallback } = data;
  const { totalTasks, completedTasks, overallProgress, completedPhases, inProgressPhases, pendingPhases } = summary;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Impersonation Enhancement Progress</h1>
        <p className="text-muted-foreground">Tracking implementation progress for superadmin impersonation system enhancements</p>
      </div>
      
      {usedFallback && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                Using fallback data. SSOT (docs/PENDING_MASTER.md) not available or unparseable.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
          <CardDescription>{completedTasks} of {totalTasks} tasks completed across {phases.length} phases</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Completion</span>
              <span className="text-2xl font-bold">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Completed Phases</p>
              <p className="text-2xl font-bold text-green-600">{completedPhases}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{inProgressPhases}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-gray-400">{pendingPhases}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        {phases.map((phase) => (
          <Card key={phase.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(phase.status)}
                  <div>
                    <CardTitle className="text-lg">{phase.name}</CardTitle>
                    <CardDescription>{phase.description}</CardDescription>
                  </div>
                </div>
                {getStatusBadge(phase.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Phase Progress</span>
                  <span className="text-sm font-bold">{phase.progress}%</span>
                </div>
                <Progress value={phase.progress} className="h-2" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Tasks:</p>
                <div className="space-y-2">
                  {phase.tasks.map((task) => (
                    <div key={task.id} className="flex items-start justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                      <div className="flex items-start gap-3 flex-1">
                        {getTaskStatusIcon(task.status)}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{task.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                            {task.commit && <code className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">{task.commit}</code>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-blue-600" />
            <div>
              <p className="font-semibold">Production Status</p>
              <p className="text-sm text-muted-foreground">{overallProgress >= 50 ? "Ready for production deployment" : "In development"} • {completedTasks}/{totalTasks} tasks complete</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
