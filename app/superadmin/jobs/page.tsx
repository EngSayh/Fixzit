"use client";

/**
 * Superadmin Jobs Management
 * Background jobs using /api/jobs/process endpoints
 * 
 * @module app/superadmin/jobs/page
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Cog, RefreshCw, Play, CheckCircle, XCircle, Clock,
  Mail, Trash2, FileText, Bell,
} from "@/components/ui/icons";

interface JobStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface Job {
  _id: string;
  type: string;
  status: string;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  processedAt?: string;
  error?: string;
}

const JOB_TYPES = [
  { id: "email", name: "Email Delivery", icon: Mail },
  { id: "s3-cleanup", name: "S3 Cleanup", icon: Trash2 },
  { id: "report", name: "Report Generation", icon: FileText },
  { id: "notification", name: "Notifications", icon: Bell },
  { id: "sla-monitor", name: "SLA Monitor", icon: Clock },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  processing: "bg-blue-500/20 text-blue-400",
  completed: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
};

export default function SuperadminJobsPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<JobStats>({ pending: 0, processing: 0, completed: 0, failed: 0 });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      // Get job stats from processing endpoint
      const response = await fetch("/api/jobs/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ maxJobs: 0 }), // Just get stats
      });
      if (response.ok) {
        const data = await response.json();
        if (data.stats) setStats(data.stats);
      }

      // Simulated recent jobs (would come from dedicated endpoint)
      setJobs([
        { _id: "1", type: "email", status: "completed", priority: 1, attempts: 1, maxAttempts: 3, createdAt: new Date(Date.now() - 60000).toISOString(), processedAt: new Date().toISOString() },
        { _id: "2", type: "s3-cleanup", status: "completed", priority: 2, attempts: 1, maxAttempts: 3, createdAt: new Date(Date.now() - 120000).toISOString(), processedAt: new Date(Date.now() - 30000).toISOString() },
        { _id: "3", type: "notification", status: "pending", priority: 1, attempts: 0, maxAttempts: 3, createdAt: new Date().toISOString() },
        { _id: "4", type: "email", status: "failed", priority: 1, attempts: 3, maxAttempts: 3, createdAt: new Date(Date.now() - 300000).toISOString(), error: "SMTP connection timeout" },
        { _id: "5", type: "report", status: "processing", priority: 2, attempts: 1, maxAttempts: 3, createdAt: new Date(Date.now() - 45000).toISOString() },
      ]);
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); const interval = setInterval(fetchJobs, 30000); return () => clearInterval(interval); }, [fetchJobs]);

  const handleProcessJobs = async () => {
    try {
      setProcessing(true);
      const response = await fetch("/api/jobs/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ maxJobs: 10, type: typeFilter === "all" ? undefined : typeFilter }),
      });
      if (!response.ok) throw new Error("Failed to process jobs");
      const data = await response.json();
      toast.success(`Processed ${data.processed?.total || 0} jobs (${data.processed?.success || 0} success, ${data.processed?.failed || 0} failed)`);
      fetchJobs();
    } catch {
      toast.error("Failed to process jobs");
    } finally {
      setProcessing(false);
    }
  };

  const handleRetryStuck = async () => {
    try {
      const response = await fetch("/api/jobs/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ maxJobs: 0 }), // This also retries stuck jobs
      });
      if (!response.ok) throw new Error("Failed to retry stuck jobs");
      toast.success("Stuck jobs reset for retry");
      fetchJobs();
    } catch {
      toast.error("Failed to retry stuck jobs");
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const total = stats.pending + stats.processing + stats.completed + stats.failed;
  const successRate = total > 0 ? ((stats.completed / total) * 100).toFixed(1) : "0";

  const filteredJobs = typeFilter === "all" ? jobs : jobs.filter(j => j.type === typeFilter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("superadmin.nav.jobs") || "Background Jobs"}</h1>
          <p className="text-muted-foreground">Monitor and manage background job processing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRetryStuck}>
            <RefreshCw className="h-4 w-4 me-2" />Retry Stuck
          </Button>
          <Button variant="outline" size="sm" onClick={fetchJobs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-yellow-500" /><div><p className="text-2xl font-bold text-foreground">{stats.pending}</p><p className="text-muted-foreground text-sm">Pending</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Cog className="h-8 w-8 text-primary animate-spin" /><div><p className="text-2xl font-bold text-foreground">{stats.processing}</p><p className="text-muted-foreground text-sm">Processing</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold text-foreground">{stats.completed}</p><p className="text-muted-foreground text-sm">Completed</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><XCircle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold text-foreground">{stats.failed}</p><p className="text-muted-foreground text-sm">Failed</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex flex-col"><p className="text-muted-foreground text-sm mb-1">Success Rate</p><Progress value={Number(successRate)} className="h-2 mb-1" /><p className="text-foreground font-bold">{successRate}%</p></div></CardContent></Card>
      </div>

      {/* Process Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Select 
              value={typeFilter} 
              onValueChange={setTypeFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Job Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {JOB_TYPES.map((type) => (<SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button onClick={handleProcessJobs} disabled={processing || stats.pending === 0}>
              {processing ? <><RefreshCw className="h-4 w-4 me-2 animate-spin" />Processing...</> : <><Play className="h-4 w-4 me-2" />Process Jobs</>}
            </Button>
            <span className="text-muted-foreground text-sm">{stats.pending} jobs waiting</span>
          </div>
        </CardContent>
      </Card>

      {/* Job Types */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {JOB_TYPES.map((type) => {
          const Icon = type.icon;
          const count = jobs.filter(j => j.type === type.id).length;
          return (
            <Card key={type.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setTypeFilter(type.id)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <p className="text-foreground font-medium">{type.name}</p>
                    <p className="text-muted-foreground text-sm">{count} recent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>Latest job activity</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12"><Cog className="h-12 w-12 text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">No jobs found</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job) => (
                  <TableRow key={job._id}>
                    <TableCell className="font-mono">{job.type}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_COLORS[job.status] || ""}>{job.status === "completed" ? <CheckCircle className="h-3 w-3 me-1" /> : job.status === "failed" ? <XCircle className="h-3 w-3 me-1" /> : job.status === "processing" ? <Cog className="h-3 w-3 me-1 animate-spin" /> : <Clock className="h-3 w-3 me-1" />}{job.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{job.attempts}/{job.maxAttempts}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(job.createdAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{job.processedAt ? formatDate(job.processedAt) : "—"}</TableCell>
                    <TableCell className="text-destructive text-sm max-w-[200px] truncate">{job.error || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
