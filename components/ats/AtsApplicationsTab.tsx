"use client";

import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import ClientDate from "@/components/ClientDate";

/**
 * Application entry type
 */
export type ApplicationEntry = {
  _id: string;
  stage: string;
  score?: number;
  createdAt?: string;
  candidateId?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    skills?: string[];
    experience?: number;
  };
  jobId?: { title?: string };
};

type AtsApplicationsTabProps = {
  applications: ApplicationEntry[];
  applicationsCount: number;
  applicationsLoading: boolean;
  applicationsError?: Error | null;
  applicationsView: "list" | "kanban";
  setApplicationsView: (view: "list" | "kanban") => void;
  ApplicationsKanban: React.ComponentType;
};

/**
 * ATS Applications Tab Content Component
 * Extracted from recruitment page for maintainability
 */
export function AtsApplicationsTab({
  applications,
  applicationsCount,
  applicationsLoading,
  applicationsError,
  applicationsView,
  setApplicationsView,
  ApplicationsKanban,
}: AtsApplicationsTabProps) {
  const auto = useAutoTranslator("ats");

  if (applicationsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {auto("Loading applications...", "applications.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (applicationsError) {
    return (
      <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-destructive mb-2">
          {auto("Error Loading Applications", "applications.errorTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {applicationsError.message}
        </p>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">📝</div>
        <h2 className="text-xl font-semibold mb-2">
          {auto("No Applications Yet", "applications.emptyTitle")}
        </h2>
        <p className="text-muted-foreground mb-4">
          {auto(
            "Applications will appear here once candidates apply to your published jobs.",
            "applications.emptySubtitle"
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {auto("All Applications ({{count}})", "applications.listTitle", {
            count: applicationsCount,
          })}
        </h2>
        <div className="flex gap-2">
          {/* View Toggle */}
          <div className="flex border rounded-md overflow-hidden">
            <button
              onClick={() => setApplicationsView("list")}
              className={`px-3 py-2 text-sm transition-colors ${
                applicationsView === "list"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-accent"
              }`}
            >
              {auto("📋 List", "applications.viewList")}
            </button>
            <button
              onClick={() => setApplicationsView("kanban")}
              className={`px-3 py-2 text-sm transition-colors ${
                applicationsView === "kanban"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-accent"
              }`}
            >
              {auto("📊 Kanban", "applications.viewKanban")}
            </button>
          </div>

          <select className="h-8 px-3 py-1.5 border rounded-md text-sm bg-muted border-input text-foreground">
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
                      {app.candidateId?.firstName} {app.candidateId?.lastName}
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
                  {app.candidateId?.skills && app.candidateId.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {app.candidateId.skills.slice(0, 5).map((skill, idx) => (
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
                  <button className="px-3 py-1 text-sm border rounded-md hover:bg-accent transition-colors">
                    View
                  </button>
                  <button className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                    Review
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
