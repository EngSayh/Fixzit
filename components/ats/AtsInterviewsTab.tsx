"use client";

import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import ClientDate from "@/components/ClientDate";

/**
 * Interview entry type
 */
export type InterviewEntry = {
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

type AtsInterviewsTabProps = {
  interviews: InterviewEntry[];
  interviewsCount: number;
  interviewsLoading: boolean;
  interviewsError?: Error | null;
  canScheduleInterviews: boolean;
  currentDate?: Date;
};

const formatInterviewDate = (date: Date) => {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatInterviewTime = (date: Date) => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * ATS Interviews Tab Content Component
 * Extracted from recruitment page for maintainability
 */
export function AtsInterviewsTab({
  interviews,
  interviewsCount,
  interviewsLoading,
  interviewsError,
  canScheduleInterviews,
  currentDate,
}: AtsInterviewsTabProps) {
  const auto = useAutoTranslator("ats");

  if (interviewsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {auto("Loading interviews...", "interviews.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (interviewsError) {
    return (
      <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-destructive mb-2">
          {auto("Error Loading Interviews", "interviews.errorTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {interviewsError.message}
        </p>
      </div>
    );
  }

  if (interviews.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">🗓️</div>
        <h2 className="text-xl font-semibold mb-2">
          {auto("No Interviews Scheduled", "interviews.emptyTitle")}
        </h2>
        <p className="text-muted-foreground mb-4">
          {auto(
            "Schedule interviews with candidates to move them through the pipeline.",
            "interviews.emptySubtitle"
          )}
        </p>
        {canScheduleInterviews && (
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            {auto("+ Schedule Interview", "interviews.scheduleCta")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {auto("Upcoming Interviews ({{count}})", "interviews.listTitle", {
            count: interviewsCount,
          })}
        </h2>
        <div className="flex gap-2">
          <select className="h-8 px-3 py-1.5 border rounded-md text-sm bg-muted border-input text-foreground">
            <option value="all">
              {auto("All Status", "interviews.filters.status.all")}
            </option>
            <option value="scheduled">
              {auto("Scheduled", "interviews.filters.status.scheduled")}
            </option>
            <option value="completed">
              {auto("Completed", "interviews.filters.status.completed")}
            </option>
            <option value="cancelled">
              {auto("Cancelled", "interviews.filters.status.cancelled")}
            </option>
            <option value="no-show">
              {auto("No Show", "interviews.filters.status.noShow")}
            </option>
          </select>
          <select className="h-8 px-3 py-1.5 border rounded-md text-sm bg-muted border-input text-foreground">
            <option value="all">
              {auto("All Stages", "interviews.filters.stage.all")}
            </option>
            <option value="screening">
              {auto("Screening", "interviews.filters.stage.screening")}
            </option>
            <option value="technical">
              {auto("Technical", "interviews.filters.stage.technical")}
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
        {interviews.map((interview) => {
          const scheduledDate = new Date(interview.scheduledAt);
          const isPast = currentDate ? scheduledDate < currentDate : false;
          const isToday = currentDate
            ? scheduledDate.toDateString() === currentDate.toDateString()
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
                      <span className="text-muted-foreground">📅 Date: </span>
                      <ClientDate
                        className="font-medium"
                        date={interview.scheduledAt}
                        formatter={formatInterviewDate}
                        placeholder="--"
                      />
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">🕐 Time: </span>
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
                        <span className="font-medium">{interview.location}</span>
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
                  {interview.interviewers && interview.interviewers.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      👥 Interviewers: {interview.interviewers.join(", ")}
                    </div>
                  )}
                  {interview.feedback?.overall && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">Rating:</span>
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
                  <button className="px-3 py-1 text-sm border rounded-md hover:bg-accent transition-colors">
                    View
                  </button>
                  {interview.status === "scheduled" && !isPast && (
                    <>
                      <button className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                        Reschedule
                      </button>
                      <button className="px-3 py-1 text-sm border border-destructive text-destructive rounded-md hover:bg-destructive/10 transition-colors">
                        Cancel
                      </button>
                    </>
                  )}
                  {interview.status === "completed" &&
                    !interview.feedback?.overall && (
                      <button className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                        {auto("Add Feedback", "interviews.addFeedback")}
                      </button>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
