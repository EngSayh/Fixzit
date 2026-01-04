"use client";

import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import ClientDate from "@/components/ClientDate";

/**
 * Job entry type
 */
export type JobEntry = {
  _id: string;
  title: string;
  status: string;
  description?: string;
  location?: string | { city?: string };
  jobType?: string;
  department?: string;
  applicationCount?: number;
  createdAt?: string;
};

type AtsJobsTabProps = {
  jobs: JobEntry[];
  jobsCount: number;
  jobsLoading: boolean;
  jobsError?: Error | null;
  canManageJobs: boolean;
};

/**
 * ATS Jobs Tab Content Component
 * Extracted from recruitment page for maintainability
 */
export function AtsJobsTab({
  jobs,
  jobsCount,
  jobsLoading,
  jobsError,
  canManageJobs,
}: AtsJobsTabProps) {
  const auto = useAutoTranslator("ats");

  if (jobsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {auto("Loading jobs...", "jobs.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (jobsError) {
    return (
      <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-destructive mb-2">
          {auto("Error Loading Jobs", "jobs.errorTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">{jobsError.message}</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">📋</div>
        <h2 className="text-xl font-semibold mb-2">
          {auto("No Jobs Yet", "jobs.emptyTitle")}
        </h2>
        <p className="text-muted-foreground mb-4">
          {auto(
            "Get started by creating your first job posting.",
            "jobs.emptySubtitle"
          )}
        </p>
        {canManageJobs && (
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            {auto("+ Create First Job", "jobs.createFirst")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {auto("All Jobs ({{count}})", "jobs.listTitle", {
            count: jobsCount,
          })}
        </h2>
        <div className="flex gap-2">
          <select className="h-8 px-3 py-1.5 border rounded-md text-sm">
            <option value="all">{auto("All Status", "jobs.filters.all")}</option>
            <option value="published">
              {auto("Published", "jobs.filters.published")}
            </option>
            <option value="draft">{auto("Draft", "jobs.filters.draft")}</option>
            <option value="closed">
              {auto("Closed", "jobs.filters.closed")}
            </option>
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {jobs.map((job) => (
          <div
            key={job._id}
            className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {job.title}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      job.status === "published"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : job.status === "draft"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span>
                    📍{" "}
                    {typeof job.location === "string"
                      ? job.location
                      : job.location?.city || auto("Remote", "jobs.locationRemote")}
                  </span>
                  <span>
                    💼 {job.jobType || auto("Full-time", "jobs.fullTime")}
                  </span>
                  <span>
                    🏢 {job.department || auto("N/A", "jobs.departmentFallback")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {job.description || auto("No description", "jobs.noDescription")}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {auto("📝 {{count}} applications", "jobs.applicationCount", {
                      count: job.applicationCount || 0,
                    })}
                  </span>
                  <span className="text-muted-foreground">
                    {auto("📅 Posted", "jobs.postedLabel")}{" "}
                    {job.createdAt ? (
                      <ClientDate
                        date={job.createdAt}
                        format="date-only"
                        className="font-medium"
                        placeholder="--"
                      />
                    ) : (
                      <span className="font-medium">--</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 ms-4">
                <button className="px-3 py-1 text-sm border rounded-md hover:bg-accent transition-colors">
                  {auto("View", "jobs.actions.view")}
                </button>
                {canManageJobs && (
                  <button className="px-3 py-1 text-sm border rounded-md hover:bg-accent transition-colors">
                    {auto("Edit", "jobs.actions.edit")}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
