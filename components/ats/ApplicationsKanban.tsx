"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DroppableStateSnapshot,
  DraggableProvided,
  DraggableStateSnapshot,
} from "@hello-pangea/dnd";
import { Mail, Phone, Star, Calendar, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import ClientDate from "@/components/ClientDate";
import { logger } from "@/lib/logger";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      payload?.error || `Request failed with status ${response.status}`,
    );
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return payload ?? {};
};

interface Application {
  _id: string;
  candidateId: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  jobId: {
    title: string;
  };
  stage: string;
  score: number;
  createdAt: string;
  updatedAt: string;
}

const STAGES = [
  { id: "applied", title: "Applied", color: "bg-primary" },
  { id: "screening", title: "Screening", color: "bg-warning" },
  { id: "interview", title: "Interview", color: "bg-accent" },
  { id: "offer", title: "Offer", color: "bg-success" },
  { id: "hired", title: "Hired", color: "bg-success" },
  { id: "rejected", title: "Rejected", color: "bg-destructive" },
];

export default function ApplicationsKanban() {
  const [optimisticApplications, setOptimisticApplications] = useState<Record<
    string,
    Application[]
  > | null>(null);

  // Fetch applications
  const {
    data: applicationsData,
    error,
    isLoading,
  } = useSWR("/api/ats/applications", fetcher);

  const applications = applicationsData?.data || [];

  // Group applications by stage
  const groupedApplications =
    optimisticApplications ||
    applications.reduce(
      (acc: Record<string, Application[]>, app: Application) => {
        if (!acc[app.stage]) {
          acc[app.stage] = [];
        }
        acc[app.stage].push(app);
        return acc;
      },
      {},
    );

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside a droppable area
    if (!destination) return;

    // Dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceStage = source.droppableId;
    const destStage = destination.droppableId;

    // Find the application being moved
    const application = applications.find(
      (app: Application) => app._id === draggableId,
    );
    if (!application) return;

    // Optimistic UI update
    const newGrouped = { ...groupedApplications };

    // Remove from source
    newGrouped[sourceStage] = newGrouped[sourceStage].filter(
      (app: Application) => app._id !== draggableId,
    );

    // Add to destination
    if (!newGrouped[destStage]) {
      newGrouped[destStage] = [];
    }
    const updatedApp = { ...application, stage: destStage };
    newGrouped[destStage].splice(destination.index, 0, updatedApp);

    setOptimisticApplications(newGrouped);

    // Update in backend
    try {
      const response = await fetch(`/api/ats/applications/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: destStage }),
      });

      if (!response.ok) {
        throw new Error("Failed to update application stage");
      }

      // Revalidate data
      await mutate("/api/ats/applications");

      toast.success(
        `Moved to ${STAGES.find((s) => s.id === destStage)?.title}`,
      );

      // Clear optimistic state
      setOptimisticApplications(null);
    } catch (error) {
      logger.error(
        "[ApplicationsKanban] Failed to update application stage",
        error,
        {
          applicationId: draggableId,
          destinationStage: destStage,
        },
      );
      toast.error("Failed to update application stage");

      // Revert optimistic update
      setOptimisticApplications(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success bg-success/10";
    if (score >= 60) return "text-warning bg-warning/10";
    return "text-destructive bg-destructive/10";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/5 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-destructive-dark">Failed to load applications</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {STAGES.map((stage) => (
            <div key={stage.id} className="flex-shrink-0 w-80">
              <div
                className={`${stage.color} text-white px-4 py-3 rounded-t-lg font-semibold flex items-center justify-between`}
              >
                <span>{stage.title}</span>
                <span className="bg-white/20 px-2 py-1 rounded text-sm">
                  {groupedApplications[stage.id]?.length || 0}
                </span>
              </div>

              <Droppable droppableId={stage.id}>
                {(
                  provided: DroppableProvided,
                  snapshot: DroppableStateSnapshot,
                ) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`bg-gray-50 dark:bg-gray-900 min-h-[500px] p-3 rounded-b-lg border-2 ${
                      snapshot.isDraggingOver
                        ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700"
                    } transition-colors`}
                  >
                    <div className="space-y-3">
                      {(groupedApplications[stage.id] || []).map(
                        (application: Application, index: number) => (
                          <Draggable
                            key={application._id}
                            draggableId={application._id}
                            index={index}
                          >
                            {(
                              provided: DraggableProvided,
                              snapshot: DraggableStateSnapshot,
                            ) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing ${
                                  snapshot.isDragging
                                    ? "shadow-lg ring-2 ring-blue-400 rotate-2"
                                    : "hover:shadow-md"
                                } transition-all`}
                                style={{
                                  ...provided.draggableProps.style,
                                }}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm">
                                      {application.candidateId.firstName[0]}
                                      {application.candidateId.lastName[0]}
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-gray-900 dark:text-white">
                                        {application.candidateId.firstName}{" "}
                                        {application.candidateId.lastName}
                                      </h4>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {application.jobId.title}
                                      </p>
                                    </div>
                                  </div>

                                  <div
                                    className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(application.score)}`}
                                  >
                                    {application.score}%
                                  </div>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    <span className="truncate">
                                      {application.candidateId.email}
                                    </span>
                                  </div>

                                  {application.candidateId.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4" />
                                      <span>
                                        {application.candidateId.phone}
                                      </span>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <Calendar className="w-3 h-3" />
                                    <span className="inline-flex items-center gap-1">
                                      Applied{" "}
                                      <ClientDate
                                        date={application.createdAt}
                                        format="date-only"
                                        className="font-medium"
                                        placeholder="--"
                                      />
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                  <button
                                    onClick={() =>
                                      (window.location.href = `/dashboard/hr/recruitment?tab=applications&id=${application._id}`)
                                    }
                                    className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1"
                                  >
                                    View Details
                                    <ChevronRight className="w-4 h-4" />
                                  </button>

                                  {application.score >= 80 && (
                                    <Star className="w-4 h-4 text-warning fill-yellow-500" />
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ),
                      )}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
