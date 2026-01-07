"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "@/components/ui/icons";
import ClientDate from "@/components/ClientDate";
import { logger } from "@/lib/logger";

interface JobPosting {
  _id: string;
  title: string;
  department?: string;
  status: string;
  jobType?: string;
  visibility?: string;
  location?: {
    city?: string;
    country?: string;
    mode?: string;
  };
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  applicationCount?: number;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const statusOrder: Record<string, number> = {
  published: 1,
  pending: 2,
  draft: 3,
  closed: 4,
  archived: 5,
};

export default function AtsJobsPage() {
  const { t } = useTranslation();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({
    moduleId: "hr",
  });
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "published" | "pending" | "draft" | "closed" | "archived" | "all"
  >("published");
  const [jobTypeFilter, setJobTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (!orgId) return;
    void fetchJobs();
  }, [orgId, statusFilter, jobTypeFilter, debouncedSearch]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      if (jobTypeFilter !== "all") {
        params.set("jobType", jobTypeFilter);
      }
      if (debouncedSearch) {
        params.set("q", debouncedSearch);
      }
      params.set("limit", "100");
      const response = await fetch(`/api/ats/jobs?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to load jobs");
      }
      setJobs(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
      logger.error("Failed to load ATS jobs", { err });
      setError(
        err instanceof Error
          ? err.message
          : t("hr.ats.jobs.error.generic", "Unable to load job postings."),
      );
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const counts: Record<string, number> = {
      published: 0,
      pending: 0,
      draft: 0,
      closed: 0,
    };
    jobs.forEach((job) => {
      if (counts[job.status] !== undefined) {
        counts[job.status] += 1;
      }
    });
    return counts;
  }, [jobs]);

  const statusOptions: { value: typeof statusFilter; label: string }[] = [
    {
      value: "published",
      label: t("hr.ats.jobs.filters.statusPublished", "Published"),
    },
    {
      value: "pending",
      label: t("hr.ats.jobs.filters.statusPending", "Pending"),
    },
    { value: "draft", label: t("hr.ats.jobs.filters.statusDraft", "Draft") },
    { value: "closed", label: t("hr.ats.jobs.filters.statusClosed", "Closed") },
    {
      value: "archived",
      label: t("hr.ats.jobs.filters.statusArchived", "Archived"),
    },
    { value: "all", label: t("hr.ats.jobs.filters.statusAll", "All statuses") },
  ];
  const jobStatusLabels: Record<string, { key: string; fallback: string }> = {
    published: { key: "hr.ats.jobs.status.published", fallback: "Published" },
    pending: { key: "hr.ats.jobs.status.pending", fallback: "Pending" },
    draft: { key: "hr.ats.jobs.status.draft", fallback: "Draft" },
    closed: { key: "hr.ats.jobs.status.closed", fallback: "Closed" },
    archived: { key: "hr.ats.jobs.status.archived", fallback: "Archived" },
  };
  const jobTypeLabels: Record<string, { key: string; fallback: string }> = {
    "full-time": {
      key: "hr.ats.jobs.jobType.full-time",
      fallback: "Full-time",
    },
    "part-time": {
      key: "hr.ats.jobs.jobType.part-time",
      fallback: "Part-time",
    },
    contract: { key: "hr.ats.jobs.jobType.contract", fallback: "Contract" },
    temporary: { key: "hr.ats.jobs.jobType.temporary", fallback: "Temporary" },
    internship: {
      key: "hr.ats.jobs.jobType.internship",
      fallback: "Internship",
    },
    remote: { key: "hr.ats.jobs.jobType.remote", fallback: "Remote" },
    hybrid: { key: "hr.ats.jobs.jobType.hybrid", fallback: "Hybrid" },
    unspecified: {
      key: "hr.ats.jobs.jobType.unspecified",
      fallback: "Unspecified",
    },
  };
  const jobVisibilityLabels: Record<string, { key: string; fallback: string }> =
    {
      internal: {
        key: "hr.ats.jobs.visibility.internal",
        fallback: "Internal",
      },
      public: { key: "hr.ats.jobs.visibility.public", fallback: "Public" },
    };

  const jobTypeOptions: { value: string; label: string }[] = [
    {
      value: "all",
      label: t("hr.ats.jobs.filters.jobTypeAll", "All job types"),
    },
    {
      value: "full-time",
      label: t("hr.ats.jobs.filters.jobTypeFullTime", "Full-time"),
    },
    {
      value: "part-time",
      label: t("hr.ats.jobs.filters.jobTypePartTime", "Part-time"),
    },
    {
      value: "contract",
      label: t("hr.ats.jobs.filters.jobTypeContract", "Contract"),
    },
    {
      value: "temporary",
      label: t("hr.ats.jobs.filters.jobTypeTemporary", "Temporary"),
    },
    {
      value: "internship",
      label: t("hr.ats.jobs.filters.jobTypeInternship", "Internship"),
    },
    {
      value: "remote",
      label: t("hr.ats.jobs.filters.jobTypeRemote", "Remote"),
    },
    {
      value: "hybrid",
      label: t("hr.ats.jobs.filters.jobTypeHybrid", "Hybrid"),
    },
  ];
  const locationModeLabels: Record<string, { key: string; fallback: string }> =
    {
      remote: { key: "hr.ats.jobs.location.remote", fallback: "Remote" },
      hybrid: { key: "hr.ats.jobs.location.hybrid", fallback: "Hybrid" },
      onsite: { key: "hr.ats.jobs.location.onsite", fallback: "Onsite" },
    };

  const formatStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return "bg-success/10 text-success border-success/30";
      case "pending":
        return "bg-warning/10 text-warning border-warning/30";
      case "draft":
        return "bg-muted text-muted-foreground border-border";
      case "closed":
      case "archived":
        return "bg-destructive/10 text-destructive border-destructive/30";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const statusDiff =
        (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
      if (statusDiff !== 0) return statusDiff;
      return (
        new Date(b.updatedAt || b.publishedAt || b.createdAt || "").getTime() -
        new Date(a.updatedAt || a.publishedAt || a.createdAt || "").getTime()
      );
    });
  }, [jobs]);

  const formatLocation = (job: JobPosting) => {
    const parts = [job.location?.city, job.location?.country].filter(Boolean);
    const locationString = parts.join(", ");
    const mode = job.location?.mode;
    if (mode && mode !== "onsite") {
      const modeConfig = locationModeLabels[mode] ?? {
        key: "hr.ats.jobs.location.unspecifiedMode",
        fallback: mode,
      };
      const modeLabel = t(modeConfig.key, modeConfig.fallback);
      return locationString ? `${locationString} • ${modeLabel}` : modeLabel;
    }
    if (!locationString && mode === "onsite") {
      return t(
        locationModeLabels.onsite.key,
        locationModeLabels.onsite.fallback,
      );
    }
    return locationString || t("hr.ats.jobs.location.unspecified", "Not specified");
  };

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="hr" />
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t("fm.org.supportContext", "Support context: {{name}}", {
            name: supportOrg.name,
          })}
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {t("hr.ats.jobs.title", "Talent & ATS")}
          </h2>
          <p className="text-muted-foreground">
            {t(
              "hr.ats.jobs.subtitle",
              "Track open roles, publishing status, and application flow.",
            )}
          </p>
        </div>
        <Button asChild aria-label={t("hr.ats.jobs.actions.newAria", "Post a new job opening")} title={t("hr.ats.jobs.actions.newAria", "Post a new job opening")}>
          <Link href="/hr/ats/jobs/new">
            {t("hr.ats.jobs.actions.new", "Post a new job")}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-muted-foreground">
            {t("hr.ats.jobs.filters.title", "Filters")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1 block">
              {t("hr.ats.jobs.filters.search", "Search")}
            </label>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="ps-9"
                placeholder={t(
                  "hr.ats.jobs.filters.searchPlaceholder",
                  "Title, dept, keyword...",
                )}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1 block">
              {t("hr.ats.jobs.filters.statusLabel", "Status")}
            </label>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as typeof statusFilter)
              }
              placeholder={t("hr.ats.jobs.filters.statusLabel", "Status")}
            >
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1 block">
              {t("hr.ats.jobs.filters.jobTypeLabel", "Job type")}
            </label>
            <Select
              value={jobTypeFilter}
              onValueChange={(value) => setJobTypeFilter(value)}
              placeholder={t("hr.ats.jobs.filters.jobTypeLabel", "Job type")}
            >
                {jobTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              {t("hr.ats.jobs.stats.published", "Published")}
            </p>
            <p className="text-2xl font-semibold mt-2">{summary.published}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              {t("hr.ats.jobs.stats.pending", "Pending review")}
            </p>
            <p className="text-2xl font-semibold mt-2">{summary.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              {t("hr.ats.jobs.stats.draft", "Drafts")}
            </p>
            <p className="text-2xl font-semibold mt-2">{summary.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              {t("hr.ats.jobs.stats.closed", "Closed")}
            </p>
            <p className="text-2xl font-semibold mt-2">{summary.closed}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-start">
                    {t("hr.ats.jobs.table.role", "Role")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("hr.ats.jobs.table.department", "Department")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("hr.ats.jobs.table.location", "Location")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("hr.ats.jobs.table.jobType", "Job type")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("hr.ats.jobs.table.applications", "Applications")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("hr.ats.jobs.table.published", "Published")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("hr.ats.jobs.table.visibility", "Visibility")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                      <p className="mt-2 text-sm">
                        {t("common.loading", "Loading...")}
                      </p>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 text-center text-destructive"
                    >
                      {error}
                    </td>
                  </tr>
                ) : sortedJobs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 text-center text-muted-foreground"
                    >
                      {t(
                        "hr.ats.jobs.empty",
                        "No job postings match your filters yet.",
                      )}
                    </td>
                  </tr>
                ) : (
                  sortedJobs.map((job) => (
                    <tr key={job._id} className="border-b border-border/60">
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-foreground">
                            {job.title}
                          </span>
                          <Badge className={formatStatusBadge(job.status)}>
                            {(() => {
                              const statusKey = (
                                job.status || ""
                              ).toLowerCase();
                              const label = jobStatusLabels[statusKey];
                              return t(
                                label?.key ?? "hr.ats.jobs.status.pending",
                                label?.fallback ?? job.status,
                              );
                            })()}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {job.department || t("common.notAvailable", "N/A")}
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {formatLocation(job)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {(() => {
                          const typeKey = (
                            job.jobType || "unspecified"
                          ).toLowerCase();
                          const label =
                            jobTypeLabels[typeKey] ?? jobTypeLabels.unspecified;
                          return t(label.key, label.fallback);
                        })()}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {job.applicationCount ?? 0}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {job.publishedAt ? (
                          <ClientDate date={job.publishedAt} format="medium" />
                        ) : (
                          t("hr.ats.jobs.notPublished", "Not yet published")
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge variant="outline">
                          {(() => {
                            const visibilityKey = (
                              job.visibility || "internal"
                            ).toLowerCase();
                            const label =
                              jobVisibilityLabels[visibilityKey] ??
                              jobVisibilityLabels.internal;
                            return t(label.key, label.fallback);
                          })()}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
