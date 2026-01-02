"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { hasPermission } from "@/lib/ats/permissions";
import type { ATSRole } from "@/lib/ats/permissions";
import ApplicationsKanban from "@/components/ats/ApplicationsKanban";
import { AnalyticsOverview } from "@/components/ats/AnalyticsOverview";
import ClientDate from "@/components/ClientDate";
import { useTranslation } from "@/contexts/TranslationContext";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

/**
 * ATS Recruitment Dashboard (Monday.com-style)
 *
 * Phase 1: Layout + Data Fetching
 * - Single global Header + Sidebar (inherited from dashboard layout)
 * - Tabs for sub-navigation (Jobs, Applications, Interviews, Pipeline, Settings)
 * - RBAC: Different views based on role permissions
 * - Real-time data fetching with SWR
 *
 * Phase 2-4: Feature implementation
 */

type FetchError = Error & { status?: number; data?: unknown };

// SWR fetcher with proper error handling for 402 Payment Required
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);

  // Handle ATS not enabled (402 Payment Required)
  if (res.status === 402) {
    const err: FetchError = new Error("ATS not enabled");
    err.status = 402;
    err.data = await res.json().catch(() => ({}));
    throw err;
  }

  // Handle other errors
  if (!res.ok) {
    const err: FetchError = new Error(`Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return res.json() as Promise<T>;
}

type AtsListResponse<T> = { data?: T };
type JobEntry = {
  _id?: string;
  title?: string;
  status?: string;
  department?: string;
  location?: { city?: string } | string;
  jobType?: string;
  openings?: number;
  createdAt?: string | Date;
  description?: string;
  applicationCount?: number;
};
type CandidateInfo = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  experience?: string;
  skills?: string[];
  culture?: Record<string, unknown>;
  education?: Record<string, unknown>;
};
type ApplicationEntry = {
  _id?: string;
  stage?: string;
  candidateId?: CandidateInfo;
  jobId?: { title?: string };
  score?: number;
  createdAt?: string | Date;
};
type CandidateRow = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  experience?: string;
  stage?: string;
  jobTitle?: string;
};

type AtsSettings = {
  scoringWeights?: {
    skills?: number;
    experience?: number;
    culture?: number;
    education?: number;
  };
  knockoutRules?: {
    minYears?: number;
    autoRejectMissingExperience?: boolean;
    autoRejectMissingSkills?: boolean;
    requiredSkills?: string[];
  };
};

const errorHasStatus = (error: unknown, status: number) =>
  typeof error === "object" &&
  error !== null &&
  "status" in error &&
  (error as FetchError).status === status;

export default function RecruitmentPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const auto = useAutoTranslator("dashboard.hrRecruitment");
  const [activeTab, setActiveTab] = useState<string>("jobs");
  const [applicationsView, setApplicationsView] = useState<"list" | "kanban">(
    "list",
  );
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
    const intervalId = window.setInterval(
      () => setCurrentDate(new Date()),
      60000,
    );
    return () => window.clearInterval(intervalId);
  }, []);

  const formatInterviewDate = useCallback(
    (value: Date, locale = "en-US") =>
      value.toLocaleDateString(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  const formatInterviewTime = useCallback(
    (value: Date, locale = "en-US") =>
      value.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  const userRole = (session?.user?.role || "Candidate") as ATSRole;

  // RBAC checks (must be before hooks)
  const canManageJobs = hasPermission(userRole, "jobs:create");
  const canViewApplications = hasPermission(userRole, "applications:read");
  const canScheduleInterviews = hasPermission(userRole, "interviews:create");
  const canViewSettings = hasPermission(userRole, "settings:read");

  // Fetch jobs data
  const {
    data: jobsData,
    error: jobsError,
    isLoading: jobsLoading,
  } = useSWR<AtsListResponse<JobEntry[]>>("/api/ats/jobs?status=all", fetcher);

  // Fetch applications data (only if user has permission)
  const {
    data: applicationsData,
    error: applicationsError,
    isLoading: applicationsLoading,
  } = useSWR<AtsListResponse<ApplicationEntry[]>>(
    canViewApplications ? "/api/ats/applications" : null,
    fetcher,
  );

  // Fetch interviews data (only if user has permission)
  const {
    data: interviewsData,
    error: interviewsError,
    isLoading: interviewsLoading,
  } = useSWR<AtsListResponse<Record<string, unknown>[]>>(
    canScheduleInterviews ? "/api/ats/interviews" : null,
    fetcher,
  );

  // Fetch analytics data (only if user has permission)
  const {
    data: analyticsData,
    error: analyticsError,
    isLoading: analyticsLoading,
  } = useSWR<AtsListResponse<Record<string, unknown>>>(
    canViewApplications ? "/api/ats/analytics?period=30" : null,
    fetcher,
  );

  // Fetch settings data (only if user has permission)
  const {
    data: settingsData,
    error: settingsError,
    isLoading: settingsLoading,
    mutate: _mutateSettings,
  } = useSWR<AtsListResponse<Record<string, unknown>>>(
    canViewSettings ? "/api/ats/settings" : null,
    fetcher,
  );

  const requiresUpgrade = useMemo(() => {
    return (
      errorHasStatus(jobsError, 402) ||
      errorHasStatus(applicationsError, 402) ||
      errorHasStatus(interviewsError, 402) ||
      errorHasStatus(analyticsError, 402) ||
      errorHasStatus(settingsError, 402)
    );
  }, [
    jobsError,
    applicationsError,
    interviewsError,
    analyticsError,
    settingsError,
  ]);

  const jobs: JobEntry[] = jobsData?.data || [];
  const jobsCount = jobs.length;
  const applications: ApplicationEntry[] = applicationsData?.data || [];
  const applicationsCount = applications.length;
  const interviews = interviewsData?.data || [];
  const interviewsCount = interviews.length;
  const analytics = analyticsData?.data || null;
  const settings: AtsSettings | null =
    (settingsData?.data as AtsSettings | undefined) ?? null;

  const candidateRows = useMemo<CandidateRow[]>(() => {
    const map = new Map<string, CandidateRow>();
    applications.forEach((app) => {
      const candidate = app.candidateId;
      if (!candidate?._id || map.has(candidate._id)) return;
      map.set(candidate._id, {
        id: candidate._id,
        name: `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim(),
        email: candidate.email,
        phone: candidate.phone,
        experience: candidate.experience,
        stage: app.stage,
        jobTitle: app.jobId?.title,
      });
    });
    return Array.from(map.values());
  }, [applications]);

  const offerRows = useMemo(
    () =>
      applications.filter((app) =>
        ["offer", "hired"].includes(app.stage ?? ""),
      ),
    [applications],
  );

  useEffect(() => {
    if (requiresUpgrade) {
      router.push("/billing/upgrade?feature=ats");
    }
  }, [requiresUpgrade, router]);

  if (requiresUpgrade) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2">
            {auto("ATS Not Enabled", "upgrade.title")}
          </h2>
          <p className="text-muted-foreground mb-4">
            {auto("Redirecting to upgrade page...", "upgrade.subtitle")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("dashboard.hrRecruitment.header.title", "Recruitment (ATS)")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t(
                "dashboard.hrRecruitment.header.subtitle",
                "Applicant Tracking System - Manage jobs, applications, and interviews",
              )}
            </p>
          </div>

          {canManageJobs && (
            <button type="button" className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors" aria-label={auto("+ New Job", "actions.newJob")}>
              {auto("+ New Job", "actions.newJob")}
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation (Monday-style) */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <TabsList className="w-full justify-start rounded-none border-b bg-background px-6 h-12 overflow-x-auto">
          <TabsTrigger
            value="jobs"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            {auto("📋 Jobs", "tabs.jobs")}
          </TabsTrigger>

          {canViewApplications && (
            <TabsTrigger
              value="applications"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              {auto("📝 Applications", "tabs.applications")}
            </TabsTrigger>
          )}

          {canViewApplications && (
            <TabsTrigger
              value="pipeline"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              {auto("🌀 Pipeline", "tabs.pipeline")}
            </TabsTrigger>
          )}

          {canViewApplications && (
            <TabsTrigger
              value="candidates"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              {auto("👥 Candidates", "tabs.candidates")}
            </TabsTrigger>
          )}

          {canScheduleInterviews && (
            <TabsTrigger
              value="interviews"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              {auto("🗓️ Interviews", "tabs.interviews")}
            </TabsTrigger>
          )}

          {canViewApplications && (
            <TabsTrigger
              value="offers"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              {auto("📄 Offers", "tabs.offers")}
            </TabsTrigger>
          )}

          {canViewApplications && (
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              {auto("📈 Analytics", "tabs.analytics")}
            </TabsTrigger>
          )}

          {canViewSettings && (
            <TabsTrigger
              value="settings"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              {auto("⚙️ Settings", "tabs.settings")}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="flex-1 p-6">
          {jobsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">
                  {auto("Loading jobs...", "jobs.loading")}
                </p>
              </div>
            </div>
          ) : jobsError ? (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-destructive mb-2">
                {auto("Error Loading Jobs", "jobs.errorTitle")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {jobsError.message}
              </p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-card border rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-xl font-semibold mb-2">
                {auto("No Jobs Yet", "jobs.emptyTitle")}
              </h2>
              <p className="text-muted-foreground mb-4">
                {auto(
                  "Get started by creating your first job posting.",
                  "jobs.emptySubtitle",
                )}
              </p>
              {canManageJobs && (
                <button type="button" className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors" aria-label={auto("+ Create First Job", "jobs.createFirst")}>
                  {auto("+ Create First Job", "jobs.createFirst")}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {auto("All Jobs ({{count}})", "jobs.listTitle", {
                    count: jobsCount,
                  })}
                </h2>
                <div className="flex gap-2">
                  <select className="px-3 py-2 border rounded-md text-sm">
                    <option value="all">
                      {auto("All Status", "jobs.filters.all")}
                    </option>
                    <option value="published">
                      {auto("Published", "jobs.filters.published")}
                    </option>
                    <option value="draft">
                      {auto("Draft", "jobs.filters.draft")}
                    </option>
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
                              : job.location?.city ||
                                auto("Remote", "jobs.locationRemote")}
                          </span>
                          <span>
                            💼{" "}
                            {job.jobType || auto("Full-time", "jobs.fullTime")}
                          </span>
                          <span>
                            🏢{" "}
                            {job.department ||
                              auto("N/A", "jobs.departmentFallback")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {job.description ||
                            auto("No description", "jobs.noDescription")}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {auto(
                              "📝 {{count}} applications",
                              "jobs.applicationCount",
                              {
                                count: job.applicationCount || 0,
                              },
                            )}
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
                        <button type="button" className="px-3 py-1 text-sm border rounded-md hover:bg-accent transition-colors" aria-label={auto("View", "jobs.actions.view")}>
                          {auto("View", "jobs.actions.view")}
                        </button>
                        {canManageJobs && (
                          <button type="button" className="px-3 py-1 text-sm border rounded-md hover:bg-accent transition-colors" aria-label={auto("Edit", "jobs.actions.edit")}>
                            {auto("Edit", "jobs.actions.edit")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Applications Tab */}
        {canViewApplications && (
          <TabsContent value="applications" className="flex-1 p-6">
            {applicationsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    {auto("Loading applications...", "applications.loading")}
                  </p>
                </div>
              </div>
            ) : applicationsError ? (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-semibold text-destructive mb-2">
                  {auto(
                    "Error Loading Applications",
                    "applications.errorTitle",
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {applicationsError.message}
                </p>
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-card border rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">📝</div>
                <h2 className="text-xl font-semibold mb-2">
                  {auto("No Applications Yet", "applications.emptyTitle")}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {auto(
                    "Applications will appear here once candidates apply to your published jobs.",
                    "applications.emptySubtitle",
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    {auto(
                      "All Applications ({{count}})",
                      "applications.listTitle",
                      {
                        count: applicationsCount,
                      },
                    )}
                  </h2>
                  <div className="flex gap-2">
                    {/* View Toggle */}
                    <div className="flex border rounded-md overflow-hidden">
                      <button type="button"
                        onClick={() => setApplicationsView("list")}
                        className={`px-3 py-2 text-sm transition-colors ${
                          applicationsView === "list"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background hover:bg-accent"
                        }`}
                        aria-label={auto("📋 List", "applications.viewList")}
                      >
                        {auto("📋 List", "applications.viewList")}
                      </button>
                      <button type="button"
                        onClick={() => setApplicationsView("kanban")}
                        className={`px-3 py-2 text-sm transition-colors ${
                          applicationsView === "kanban"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background hover:bg-accent"
                        }`}
                        aria-label={auto("📊 Kanban", "applications.viewKanban")}
                      >
                        {auto("📊 Kanban", "applications.viewKanban")}
                      </button>
                    </div>

                    <select className="px-3 py-2 border rounded-md text-sm">
                      <option value="all">
                        {auto("All Stages", "applications.filters.all")}
                      </option>
                      <option value="applied">
                        {auto("Applied", "applications.filters.applied")}
                      </option>
                      <option value="screening">
                        {auto("Screening", "applications.filters.screening")}
                      </option>
                      <option value="interview">
                        {auto("Interview", "applications.filters.interview")}
                      </option>
                      <option value="offer">
                        {auto("Offer", "applications.filters.offer")}
                      </option>
                      <option value="hired">
                        {auto("Hired", "applications.filters.hired")}
                      </option>
                      <option value="rejected">
                        {auto("Rejected", "applications.filters.rejected")}
                      </option>
                    </select>
                  </div>
                </div>

                {applicationsView === "kanban" ? (
                  <ApplicationsKanban />
                ) : (
                  <div className="grid gap-4">
                    {applications.map((app) => (
                      <div
                        key={app._id}
                        className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-foreground">
                                {app.candidateId?.firstName}{" "}
                                {app.candidateId?.lastName}
                              </h3>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  app.stage === "hired"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : app.stage === "offer"
                                      ? "bg-primary/10 text-primary dark:bg-primary/20/30 dark:text-primary"
                                      : app.stage === "interview"
                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                        : app.stage === "screening"
                                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                          : app.stage === "rejected"
                                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                }`}
                              >
                                {app.stage}
                              </span>
                              {app.score && (
                                <span className="text-sm font-medium text-primary">
                                  Score: {app.score}%
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <span>💼 {app.jobId?.title}</span>
                              <span>📧 {app.candidateId?.email}</span>
                              {app.candidateId?.phone && (
                                <span>📱 {app.candidateId?.phone}</span>
                              )}
                            </div>
                            {app.candidateId?.skills &&
                              app.candidateId.skills.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {app.candidateId.skills
                                    .slice(0, 5)
                                    .map((skill: string, idx: number) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                  {app.candidateId.skills.length > 5 && (
                                    <span className="px-2 py-1 text-xs text-muted-foreground">
                                      +{app.candidateId.skills.length - 5} more
                                    </span>
                                  )}
                                </div>
                              )}
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">
                                📅 Applied{" "}
                                {app.createdAt ? (
                                  <ClientDate
                                    date={app.createdAt}
                                    format="date-only"
                                    className="font-medium"
                                    placeholder="--"
                                  />
                                ) : (
                                  <span className="font-medium">--</span>
                                )}
                              </span>
                              {app.candidateId?.experience && (
                                <span className="text-muted-foreground">
                                  🎯 {app.candidateId.experience} years exp.
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ms-4">
                            <button type="button" className="px-3 py-1 text-sm border rounded-md hover:bg-accent transition-colors" aria-label="View application">
                              View
                            </button>
                            <button type="button" className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors" aria-label="Review application">
                              Review
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        )}

        {/* Interviews Tab */}
        {canScheduleInterviews && (
          <TabsContent value="interviews" className="flex-1 p-6">
            {interviewsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    {auto("Loading interviews...", "interviews.loading")}
                  </p>
                </div>
              </div>
            ) : interviewsError ? (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-semibold text-destructive mb-2">
                  {auto("Error Loading Interviews", "interviews.errorTitle")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {interviewsError.message}
                </p>
              </div>
            ) : interviews.length === 0 ? (
              <div className="bg-card border rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">🗓️</div>
                <h2 className="text-xl font-semibold mb-2">
                  {auto("No Interviews Scheduled", "interviews.emptyTitle")}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {auto(
                    "Schedule interviews with candidates to move them through the pipeline.",
                    "interviews.emptySubtitle",
                  )}
                </p>
                {canScheduleInterviews && (
                  <button type="button" className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors" aria-label={auto("+ Schedule Interview", "interviews.scheduleCta")}>
                    {auto("+ Schedule Interview", "interviews.scheduleCta")}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    {auto(
                      "Upcoming Interviews ({{count}})",
                      "interviews.listTitle",
                      {
                        count: interviewsCount,
                      },
                    )}
                  </h2>
                  <div className="flex gap-2">
                    <select className="px-3 py-2 border rounded-md text-sm">
                      <option value="all">
                        {auto("All Status", "interviews.filters.status.all")}
                      </option>
                      <option value="scheduled">
                        {auto(
                          "Scheduled",
                          "interviews.filters.status.scheduled",
                        )}
                      </option>
                      <option value="completed">
                        {auto(
                          "Completed",
                          "interviews.filters.status.completed",
                        )}
                      </option>
                      <option value="cancelled">
                        {auto(
                          "Cancelled",
                          "interviews.filters.status.cancelled",
                        )}
                      </option>
                      <option value="no-show">
                        {auto("No Show", "interviews.filters.status.noShow")}
                      </option>
                    </select>
                    <select className="px-3 py-2 border rounded-md text-sm">
                      <option value="all">
                        {auto("All Stages", "interviews.filters.stage.all")}
                      </option>
                      <option value="screening">
                        {auto(
                          "Screening",
                          "interviews.filters.stage.screening",
                        )}
                      </option>
                      <option value="technical">
                        {auto(
                          "Technical",
                          "interviews.filters.stage.technical",
                        )}
                      </option>
                      <option value="hr">
                        {auto("HR Round", "interviews.filters.stage.hr")}
                      </option>
                      <option value="final">
                        {auto("Final Round", "interviews.filters.stage.final")}
                      </option>
                      <option value="panel">
                        {auto("Panel", "interviews.filters.stage.panel")}
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4">
                  {interviews.map((interviewRaw: Record<string, unknown>) => {
                    const interview = interviewRaw as {
                      _id: string;
                      scheduledAt: string;
                      status: string;
                      stage: string;
                      duration?: number;
                      location?: string;
                      meetingUrl?: string;
                      interviewers?: string[];
                      feedback?: { overall?: number; recommendation?: string };
                      candidateId?: {
                        firstName?: string;
                        lastName?: string;
                        email?: string;
                      };
                      jobId?: { title?: string };
                    };
                    const scheduledDate = new Date(interview.scheduledAt);
                    const isPast = currentDate
                      ? scheduledDate < currentDate
                      : false;
                    const isToday = currentDate
                      ? scheduledDate.toDateString() ===
                        currentDate.toDateString()
                      : false;

                    return (
                      <div
                        key={interview._id}
                        className={`bg-card border rounded-lg p-6 hover:shadow-md transition-shadow ${
                          isToday ? "border-s-4 border-s-primary" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-foreground">
                                {interview.candidateId?.firstName}{" "}
                                {interview.candidateId?.lastName}
                              </h3>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  interview.status === "completed"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : interview.status === "scheduled"
                                      ? "bg-primary/10 text-primary dark:bg-primary/20/30 dark:text-primary"
                                      : interview.status === "cancelled"
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        : interview.status === "no-show"
                                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                }`}
                              >
                                {interview.status}
                              </span>
                              <span className="px-2 py-1 text-xs bg-secondary/20 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
                                {interview.stage}
                              </span>
                              {isToday && (
                                <span className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full font-semibold">
                                  Today
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <span>💼 {interview.jobId?.title}</span>
                              <span>📧 {interview.candidateId?.email}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div className="text-sm">
                                <span className="text-muted-foreground">
                                  📅 Date:{" "}
                                </span>
                                <ClientDate
                                  className="font-medium"
                                  date={interview.scheduledAt}
                                  formatter={formatInterviewDate}
                                  placeholder="--"
                                />
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">
                                  🕐 Time:{" "}
                                </span>
                                <ClientDate
                                  className="font-medium"
                                  date={interview.scheduledAt}
                                  formatter={formatInterviewTime}
                                  placeholder="--"
                                />
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">
                                  ⏱️ Duration:{" "}
                                </span>
                                <span className="font-medium">
                                  {interview.duration || 60} min
                                </span>
                              </div>
                              {interview.location && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">
                                    📍 Location:{" "}
                                  </span>
                                  <span className="font-medium">
                                    {interview.location}
                                  </span>
                                </div>
                              )}
                            </div>
                            {interview.meetingUrl && (
                              <div className="mb-3">
                                <a
                                  href={interview.meetingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline"
                                >
                                  🔗 Join Meeting
                                </a>
                              </div>
                            )}
                            {interview.interviewers &&
                              interview.interviewers.length > 0 && (
                                <div className="text-sm text-muted-foreground">
                                  👥 Interviewers:{" "}
                                  {interview.interviewers.join(", ")}
                                </div>
                              )}
                            {interview.feedback?.overall && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="text-muted-foreground">
                                    Rating:
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <span
                                        key={i}
                                        className={
                                          i < (interview.feedback?.overall || 0)
                                            ? "text-yellow-500"
                                            : "text-gray-300"
                                        }
                                      >
                                        ⭐
                                      </span>
                                    ))}
                                  </div>
                                  <span className="px-2 py-1 text-xs rounded-full bg-accent">
                                    {interview.feedback.recommendation}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 ms-4">
                            <button type="button" className="px-3 py-1 text-sm border rounded-md hover:bg-accent transition-colors" aria-label="View interview">
                              View
                            </button>
                            {interview.status === "scheduled" && !isPast && (
                              <>
                                <button type="button" className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors" aria-label="Reschedule interview">
                                  Reschedule
                                </button>
                                <button type="button" className="px-3 py-1 text-sm border border-destructive text-destructive rounded-md hover:bg-destructive/10 transition-colors" aria-label="Cancel interview">
                                  Cancel
                                </button>
                              </>
                            )}
                            {interview.status === "completed" &&
                              !interview.feedback?.overall && (
                                <button type="button" className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors" aria-label={auto("Add Feedback", "interviews.addFeedback")}>
                                  {auto(
                                    "Add Feedback",
                                    "interviews.addFeedback",
                                  )}
                                </button>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        )}

        {/* Pipeline Tab */}
        {canViewApplications && (
          <TabsContent value="pipeline" className="flex-1 p-6">
            <ApplicationsKanban />
          </TabsContent>
        )}

        {canViewApplications && (
          <TabsContent value="candidates" className="flex-1 p-6">
            {candidateRows.length === 0 ? (
              <div className="bg-card border rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">👥</div>
                <h2 className="text-xl font-semibold mb-2">
                  {auto("No Candidates Yet", "candidates.emptyTitle")}
                </h2>
                <p className="text-muted-foreground">
                  {auto(
                    "New applicants will appear here for quick review.",
                    "candidates.emptySubtitle",
                  )}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-xl">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Candidate
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Role
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Stage
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Experience
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {candidateRows.map((candidate) => (
                      <tr key={candidate.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {candidate.name || "Candidate"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {candidate.email}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {candidate.jobTitle || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs rounded-full bg-accent">
                            {candidate.stage}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {candidate.experience
                            ? `${candidate.experience} yrs`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button type="button" className="px-3 py-1 border rounded-md text-xs" aria-label={auto("Profile", "candidates.actions.profile")}>
                              {auto("Profile", "candidates.actions.profile")}
                            </button>
                            <button type="button" className="px-3 py-1 border rounded-md text-xs" aria-label={auto("Notes", "candidates.actions.notes")}>
                              {auto("Notes", "candidates.actions.notes")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        )}

        {/* Analytics Tab */}
        {canViewApplications && (
          <TabsContent value="analytics" className="flex-1 p-6">
            {analyticsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    {auto("Loading analytics...", "analytics.loading")}
                  </p>
                </div>
              </div>
            ) : analyticsError ? (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-semibold text-destructive mb-2">
                  {auto("Error Loading Analytics", "analytics.errorTitle")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {analyticsError.message}
                </p>
              </div>
            ) : !analytics ? (
              <div className="bg-card border rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-xl font-semibold mb-2">
                  {auto("No Data Yet", "analytics.emptyTitle")}
                </h2>
                <p className="text-muted-foreground">
                  {auto(
                    "Analytics will appear once you have applications in your pipeline.",
                    "analytics.emptySubtitle",
                  )}
                </p>
              </div>
            ) : (
              <AnalyticsOverview data={analytics} />
            )}
          </TabsContent>
        )}

        {canViewApplications && (
          <TabsContent value="offers" className="flex-1 p-6 space-y-4">
            {offerRows.length === 0 ? (
              <div className="bg-card border rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">📄</div>
                <h2 className="text-xl font-semibold mb-2">
                  {auto("No Offers Yet", "offers.emptyTitle")}
                </h2>
                <p className="text-muted-foreground">
                  {auto(
                    "Candidates moved to the offer stage will show up here.",
                    "offers.emptySubtitle",
                  )}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-xl">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Candidate
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Role
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Stage
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        PDF
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {offerRows.map((app) => (
                      <tr key={app._id}>
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {`${app.candidateId?.firstName || ""} ${app.candidateId?.lastName || ""}`.trim()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {app.candidateId?.email}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {app.jobId?.title || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 text-xs rounded-full bg-accent">
                            {app.stage}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <a
                            className="px-3 py-1 border rounded-md text-xs hover:bg-muted transition-colors"
                            href={`/api/ats/offers/${app._id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Download
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Offer PDFs are generated on demand using our in-house pdfkit
              templating so Finance and HR stay aligned.
            </p>
          </TabsContent>
        )}

        {/* Settings Tab */}
        {canViewSettings && (
          <TabsContent value="settings" className="flex-1 p-6">
            {settingsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    {auto("Loading settings...", "settings.loading")}
                  </p>
                </div>
              </div>
            ) : settingsError ? (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-semibold text-destructive mb-2">
                  {auto("Error Loading Settings", "settings.errorTitle")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {settingsError.message}
                </p>
              </div>
            ) : (
              <div className="space-y-6 max-w-4xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {auto("ATS Settings", "settings.title")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {auto(
                        "Configure screening rules and scoring weights",
                        "settings.subtitle",
                      )}
                    </p>
                  </div>
                </div>

                {/* Scoring Weights */}
                <div className="bg-card border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {auto(
                      "Application Scoring Weights",
                      "settings.scoring.title",
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {auto(
                      "Adjust how different factors contribute to candidate scores (must total 100%)",
                      "settings.scoring.subtitle",
                    )}
                  </p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium block mb-2">
                          {auto(
                            "Skills Match ({{percent}}%)",
                            "settings.scoring.skills",
                            {
                              percent: settings?.scoringWeights?.skills
                                ? Math.round(
                                    settings.scoringWeights.skills * 100,
                                  )
                                : 60,
                            },
                          )}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={
                            settings?.scoringWeights?.skills
                              ? Math.round(settings.scoringWeights.skills * 100)
                              : 60
                          }
                          className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                          disabled
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-2">
                          {auto(
                            "Experience ({{percent}}%)",
                            "settings.scoring.experience",
                            {
                              percent: settings?.scoringWeights?.experience
                                ? Math.round(
                                    settings.scoringWeights.experience * 100,
                                  )
                                : 30,
                            },
                          )}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={
                            settings?.scoringWeights?.experience
                              ? Math.round(
                                  settings.scoringWeights.experience * 100,
                                )
                              : 30
                          }
                          className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                          disabled
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-2">
                          {auto(
                            "Culture Fit ({{percent}}%)",
                            "settings.scoring.culture",
                            {
                              percent: settings?.scoringWeights?.culture
                                ? Math.round(
                                    settings.scoringWeights.culture * 100,
                                  )
                                : 5,
                            },
                          )}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={
                            settings?.scoringWeights?.culture
                              ? Math.round(
                                  settings.scoringWeights.culture * 100,
                                )
                              : 5
                          }
                          className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                          disabled
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-2">
                          {auto(
                            "Education ({{percent}}%)",
                            "settings.scoring.education",
                            {
                              percent: settings?.scoringWeights?.education
                                ? Math.round(
                                    settings.scoringWeights.education * 100,
                                  )
                                : 5,
                            },
                          )}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={
                            settings?.scoringWeights?.education
                              ? Math.round(
                                  settings.scoringWeights.education * 100,
                                )
                              : 5
                          }
                          className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                          disabled
                        />
                      </div>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Total:</span>{" "}
                        {(() => {
                          if (!settings?.scoringWeights) return 100;
                          const weights = settings.scoringWeights;
                          const total =
                            (weights.skills ?? 0) +
                            (weights.experience ?? 0) +
                            (weights.culture ?? 0) +
                            (weights.education ?? 0);
                          return Math.round(total * 100);
                        })()}
                        %
                      </p>
                    </div>
                  </div>
                </div>

                {/* Knockout Rules */}
                <div className="bg-card border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {auto("Knockout Rules", "settings.knockout.title")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {auto(
                      "Automatically reject candidates who don't meet minimum requirements",
                      "settings.knockout.subtitle",
                    )}
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
                      <div>
                        <div className="font-medium">
                          {auto(
                            "Minimum Years of Experience",
                            "settings.knockout.minExperience",
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Current: {settings?.knockoutRules?.minYears || 0}{" "}
                          years
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {settings?.knockoutRules?.minYears || 0}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
                      <div>
                        <div className="font-medium">
                          {auto(
                            "Auto-Reject Missing Experience",
                            "settings.knockout.autoRejectExperience",
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Reject if experience field is empty
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          settings?.knockoutRules?.autoRejectMissingExperience
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {settings?.knockoutRules?.autoRejectMissingExperience
                          ? auto("Enabled", "settings.status.enabled")
                          : auto("Disabled", "settings.status.disabled")}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
                      <div>
                        <div className="font-medium">
                          {auto(
                            "Auto-Reject Missing Skills",
                            "settings.knockout.autoRejectSkills",
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Reject if required skills are missing
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          settings?.knockoutRules?.autoRejectMissingSkills
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {settings?.knockoutRules?.autoRejectMissingSkills
                          ? auto("Enabled", "settings.status.enabled")
                          : auto("Disabled", "settings.status.disabled")}
                      </div>
                    </div>

                    <div className="p-4 bg-accent rounded-lg">
                      <div className="font-medium mb-2">
                        {auto(
                          "Required Skills",
                          "settings.knockout.requiredSkills",
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {settings?.knockoutRules?.requiredSkills &&
                        settings.knockoutRules.requiredSkills.length > 0 ? (
                          settings.knockoutRules.requiredSkills.map(
                            (skill: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                              >
                                {skill}
                              </span>
                            ),
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {auto(
                              "No required skills configured",
                              "settings.knockout.none",
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email Templates Placeholder */}
                <div className="bg-card border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {auto("Email Templates", "settings.email.title")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {auto(
                      "Customize automated email notifications",
                      "settings.email.subtitle",
                    )}
                  </p>
                  <div className="space-y-3">
                    <div className="p-4 bg-accent rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-medium">Application Received</div>
                        <div className="text-sm text-muted-foreground">
                          Sent when candidate applies
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Default template
                      </span>
                    </div>
                    <div className="p-4 bg-accent rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-medium">Interview Scheduled</div>
                        <div className="text-sm text-muted-foreground">
                          Sent when interview is booked
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Default template
                      </span>
                    </div>
                    <div className="p-4 bg-accent rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-medium">Offer Extended</div>
                        <div className="text-sm text-muted-foreground">
                          Sent when offer is made
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Default template
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 dark:bg-primary/20/20 border border-primary/20 dark:border-primary/30 rounded-lg p-4">
                  <p className="text-sm text-primary-dark dark:text-primary-light">
                    <span className="font-medium">Note:</span> Settings editing
                    UI will be enabled in Phase 3. Currently displaying
                    read-only configuration.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
