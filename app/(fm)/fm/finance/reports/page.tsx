"use client";

import { useEffect, useState, type ReactNode } from "react";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ExternalLink, Loader2, Plus } from "@/components/ui/icons";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { FmGuardedPage } from "@/components/fm/FmGuardedPage";

type ReportJob = {
  id: string;
  name: string;
  type: string;
  format: string;
  status: "queued" | "processing" | "ready" | "failed";
  updatedAt?: string;
  fileKey?: string;
  createdAt?: string;
  notes?: string;
  clean?: boolean;
};

export default function ReportsPage() {
  return (
    <FmGuardedPage moduleId="finance">
      {({ orgId, supportBanner }) => (
        <ReportsContent orgId={orgId} supportBanner={supportBanner} />
      )}
    </FmGuardedPage>
  );
}

type ReportsContentProps = {
  orgId: string;
  supportBanner?: ReactNode | null;
};

function ReportsContent({ orgId, supportBanner }: ReportsContentProps) {
  const auto = useAutoTranslator("fm.reports");
  const [jobs, setJobs] = useState<ReportJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  const loadJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/fm/reports?orgId=${encodeURIComponent(orgId)}`);
      const data = await res.json();
      if (res.ok && data?.success) {
        setJobs(data.data || []);
      }
    } catch (error) {
      logger.error("Failed to load report jobs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, [orgId]);

  const handleReportCreated = (newJob: ReportJob) => {
    setJobs((prev) => [newJob, ...prev]);
  };

  const handleDownload = async (id: string) => {
    try {
      setDownloadingId(id);
      const res = await fetch(`/api/fm/reports/${id}/download`);
      const data = await res.json();
      if (!res.ok || !data?.success || !data.downloadUrl) {
        throw new Error(data?.error || "Download unavailable");
      }
      window.open(data.downloadUrl, "_blank");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : auto("Download failed", "errors.downloadFailed");
      toast.error(message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="reports" />
      {supportBanner}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {auto("Reports", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto("Analytics and reporting dashboard", "header.subtitle")}
          </p>
        </div>
        <CreateReportDialog orgId={orgId} onCreated={handleReportCreated} />
      </div>

      <div className="bg-card rounded-2xl shadow-md border border-border p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {auto("Reports & Analytics", "card.title")}
        </h2>
        <p className="text-muted-foreground mb-4">
          {auto("Reports interface loads here.", "card.description")}
        </p>
        <p className="text-sm text-muted-foreground">
          {auto("Connected to Reports API endpoints.", "card.footer")}
        </p>
      </div>

      <div className="bg-card rounded-2xl shadow-md border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {auto("Recent report jobs", "list.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Latest requests with download links when ready",
                "list.subtitle",
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadJobs}
            disabled={loading}
            aria-label={auto("Refresh report jobs", "actions.refreshAria")}
          >
            {loading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
            {auto("Refresh", "actions.refresh")}
          </Button>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {auto("No report jobs yet.", "list.empty")}
          </p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-semibold">
                      {job.name}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {job.type} · {job.format.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {auto("Status", "fields.status")}: {job.status}
                    {job.updatedAt
                      ? ` · ${new Date(job.updatedAt).toLocaleString()}`
                      : ""}
                    {job.clean === false
                      ? ` · ${auto("Failed scan", "status.scanFailed")}`
                      : ""}
                  </p>
                  {job.notes && (
                    <p className="text-[11px] text-muted-foreground">
                      {job.notes}
                    </p>
                  )}
                </div>
                {job.status === "ready" && job.fileKey ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleDownload(job.id)}
                    disabled={downloadingId === job.id}
                    aria-label={auto(`Download report ${job.name}`, "actions.downloadAria")}
                  >
                    {downloadingId === job.id && (
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                    )}
                    <ExternalLink className="w-4 h-4 me-2" />
                    {auto("Download", "actions.download")}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {job.status === "failed"
                      ? auto("Failed (scan or generation)", "status.failed")
                      : auto("Processing", "status.processing")}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateReportDialog({
  orgId,
  onCreated,
}: {
  orgId: string;
  onCreated: (job: ReportJob) => void;
}) {
  const auto = useAutoTranslator("fm.reports.create");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("financial_summary");
  const [format, setFormat] = useState("pdf");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportTypes = [
    { value: "financial_summary", label: auto("Financial Summary", "types.financialSummary") },
    { value: "income_statement", label: auto("Income Statement", "types.incomeStatement") },
    { value: "balance_sheet", label: auto("Balance Sheet", "types.balanceSheet") },
    { value: "expense_report", label: auto("Expense Report", "types.expenseReport") },
    { value: "budget_variance", label: auto("Budget Variance", "types.budgetVariance") },
    { value: "invoice_aging", label: auto("Invoice Aging", "types.invoiceAging") },
    { value: "payment_history", label: auto("Payment History", "types.paymentHistory") },
  ];

  const formats = [
    { value: "pdf", label: "PDF" },
    { value: "xlsx", label: "Excel (XLSX)" },
    { value: "csv", label: "CSV" },
  ];

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(auto("Report name is required", "errors.nameRequired"));
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(auto("Creating report...", "toast.loading"));

    try {
      const response = await fetch("/api/fm/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          name: name.trim(),
          type,
          format,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Failed to create report");
      }

      toast.success(auto("Report job queued successfully", "toast.success"), {
        id: toastId,
      });
      onCreated(data.data as ReportJob);
      setOpen(false);
      setName("");
      setType("financial_summary");
      setFormat("pdf");
      setDateFrom("");
      setDateTo("");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : auto("Failed to create report", "toast.error");
      toast.error(message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button aria-label={auto("Create a new report", "triggerAria")}>
          <Plus className="w-4 h-4 me-2" />
          {auto("Create Report", "trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{auto("Generate New Report", "title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label htmlFor="report-name" className="text-sm font-medium">
              {auto("Report Name", "fields.name")} *
            </label>
            <Input
              id="report-name"
              placeholder={auto("e.g. Q1 2024 Financial Summary", "fields.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="report-type" className="text-sm font-medium">
              {auto("Report Type", "fields.type")}
            </label>
            <Select value={type} onValueChange={setType} disabled={isSubmitting} placeholder="Select report type">
              <SelectTrigger id="report-type"></SelectTrigger>
              <SelectContent>
                {reportTypes.map((rt) => (
                  <SelectItem key={rt.value} value={rt.value}>
                    {rt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="report-format" className="text-sm font-medium">
              {auto("Format", "fields.format")}
            </label>
            <Select value={format} onValueChange={setFormat} disabled={isSubmitting} placeholder="Select format">
              <SelectTrigger id="report-format"></SelectTrigger>
              <SelectContent>
                {formats.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="report-date-from" className="text-sm font-medium">
                {auto("Date From", "fields.dateFrom")}
              </label>
              <Input
                id="report-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="report-date-to" className="text-sm font-medium">
                {auto("Date To", "fields.dateTo")}
              </label>
              <Input
                id="report-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
            className="w-full"
            aria-label={auto("Generate the report", "submitAria")}
          >
            {isSubmitting
              ? auto("Creating...", "submit.loading")
              : auto("Generate Report", "submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
