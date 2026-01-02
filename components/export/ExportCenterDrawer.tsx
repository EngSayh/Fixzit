"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { formatDistanceToNowStrict } from "date-fns";
import { FileText, Download, RefreshCcw, Clock4, AlertTriangle } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { type FilterEntityType } from "@/lib/filters/entities";

type ExportJobRecord = {
  _id: string;
  status: "queued" | "processing" | "completed" | "failed";
  format: "csv" | "xlsx";
  created_at: string;
  file_url?: string;
  error_message?: string;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch export jobs (${res.status})`);
  }
  return res.json() as Promise<{ jobs: ExportJobRecord[] }>;
};

export interface ExportCenterDrawerProps {
  entityType: FilterEntityType;
  currentFilters: Record<string, unknown>;
  currentSearch?: string;
  selectedIds?: string[];
}

export function ExportCenterDrawer({
  entityType,
  currentFilters,
  currentSearch,
  selectedIds = [],
}: ExportCenterDrawerProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const { data, mutate, isLoading } = useSWR(
    open ? `/api/export-jobs?entity_type=${entityType}` : null,
    fetcher,
    { refreshInterval: 30_000 }
  );

  const jobs = data?.jobs || [];

  const hasSelection = selectedIds.length > 0;

  const currentFiltersCount = useMemo(
    () => Object.keys(currentFilters || {}).length,
    [currentFilters]
  );

  const handleCreateExport = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/export-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: entityType,
          format,
          filters: currentFilters,
          search: currentSearch,
          ids: selectedIds,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to start export" }));
        throw new Error(error.error || "Failed to start export");
      }

      toast({
        title: "Export queued",
        description: "You can track progress below.",
      });
      await mutate();
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unable to queue export",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: ExportJobRecord["status"]) => {
    const variants: Record<ExportJobRecord["status"], string> = {
      queued: "bg-warning/10 text-warning border border-warning/30",
      processing: "bg-info/10 text-info border border-info/30",
      completed: "bg-success/10 text-success border border-success/20",
      failed: "bg-destructive/10 text-destructive border border-destructive/30",
    };
    return <Badge className={variants[status]}>{status}</Badge>;
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <FileText className="w-4 h-4 me-2" />
        Export
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Export Center</DialogTitle>
            <DialogDescription>
              Queue background CSV/XLS exports. Jobs run with your current filters and selection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="format">Format</Label>
                <Select
                  id="format"
                  value={format}
                  onValueChange={(value) => setFormat(value as "csv" | "xlsx")}
                >
                  <SelectItem value="csv">CSV (fast)</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                </Select>
              </div>
              <div className="space-y-1 rounded-lg border p-3 bg-muted/30">
                <div className="text-sm font-medium">Scope</div>
                <div className="text-xs text-muted-foreground">
                  {hasSelection
                    ? `${selectedIds.length} selected rows`
                    : "All rows matching current filters"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Filters: {currentFiltersCount} • Search: {currentSearch || "—"}
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock4 className="w-4 h-4" />
                Jobs refresh every 30s
              </div>
              <Button variant="ghost" size="sm" onClick={() => mutate()} disabled={isLoading}>
                <RefreshCcw className={`w-4 h-4 me-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto rounded-lg border p-3">
              {jobs.length === 0 && (
                <div className="text-muted-foreground text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  No export jobs yet. Queue one to see history.
                </div>
              )}

              {jobs.map((job) => (
                <div
                  key={job._id}
                  className="flex items-center justify-between rounded-md border bg-background/80 px-3 py-2"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium uppercase tracking-tight">{job.format}</span>
                      {statusBadge(job.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(job.created_at), { addSuffix: true })}
                    </div>
                    {job.error_message ? (
                      <div className="text-xs text-destructive">{job.error_message}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {job.file_url ? (
                      <a
                        href={job.file_url}
                        className="text-primary text-sm inline-flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} aria-label="Close export dialog">
              Close
            </Button>
            <Button onClick={handleCreateExport} disabled={submitting} aria-label="Queue this export for processing">
              {submitting ? "Queuing..." : "Queue Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
