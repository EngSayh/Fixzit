"use client";

import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFmOrgGuard } from "@/components/fm/useFmOrgGuard";
import { useTranslation } from "@/contexts/TranslationContext";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Clock,
  ListChecks,
  UserCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useHrLeaveRequests } from "@/hooks/fm/useHrData";

type ApprovalRequest = {
  id: string;
  requester: string;
  team: string;
  duration: string;
  submittedAt: string;
  coverageRisk: "low" | "medium" | "high";
  notes?: string;
};

const playbooks = [
  {
    title: "Escalate to regional HRBP",
    detail: "Use when coverage drops below 65% for any site.",
    status: "ready",
  },
  {
    title: "Auto-hold conflicting requests",
    detail: "Applies to high-risk teams during Ramadan & Hajj windows.",
    status: "in-flight",
  },
  {
    title: "Sync to payroll accruals",
    detail: "Push approvals to payroll to reserve balances.",
    status: "planned",
  },
];

export default function LeaveApprovalsHub() {
  const auto = useAutoTranslator("fm.hr.leaveApprovals");
  const { t } = useTranslation();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({
    moduleId: "hr",
  });
  const { requests, isLoading, error, refresh } = useHrLeaveRequests(
    "PENDING",
    orgId,
  );

  const queue: ApprovalRequest[] = useMemo(() => {
    return requests.map((req) => {
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      const duration = `${req.numberOfDays} ${auto("days", "queue.days")} · ${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
      const coverageRisk =
        req.numberOfDays >= 7
          ? "high"
          : req.numberOfDays >= 4
            ? "medium"
            : "low";

      return {
        id: req._id,
        requester: `${req.employeeId.firstName} ${req.employeeId.lastName}`,
        team: req.employeeId.employeeCode ?? auto("Employee", "queue.employee"),
        duration,
        submittedAt: formatDistanceToNow(start, { addSuffix: true }),
        coverageRisk,
        notes: req.reason,
      };
    });
  }, [auto, requests]);

  const [selectedRequest, setSelectedRequest] =
    useState<ApprovalRequest | null>(null);

  useEffect(() => {
    if (!selectedRequest && queue.length > 0) {
      setSelectedRequest(queue[0]);
    }
  }, [queue, selectedRequest]);

  const riskMeta: Record<
    ApprovalRequest["coverageRisk"],
    { label: string; className: string }
  > = useMemo(
    () => ({
      high: {
        label: auto("High coverage risk", "risk.high"),
        className: "bg-destructive/15 text-destructive",
      },
      medium: {
        label: auto("Medium risk", "risk.medium"),
        className: "bg-warning/15 text-warning",
      },
      low: {
        label: auto("Low risk", "risk.low"),
        className: "bg-success/15 text-success",
      },
    }),
    [auto],
  );

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

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {auto("Approvals workbench", "header.kicker")}
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            {auto("Leave approval queue", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "Triage requests with SLA and coverage context before they hit payroll or frontline staffing.",
              "header.subtitle",
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refresh()}>
            <ListChecks className="me-2 h-4 w-4" />
            {auto("Playbook settings", "actions.playbook")}
          </Button>
          <Button>
            <UserCheck className="me-2 h-4 w-4" />
            {auto("Assign reviewer", "actions.assign")}
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{auto("Pending approvals", "queue.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Sort by SLA breach risk or staffing impact.",
                "queue.subtitle",
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-destructive">
                <p className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  {auto("Failed to load pending approvals.", "queue.error")}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => refresh()}
                >
                  {auto("Retry", "queue.retry")}
                </Button>
              </div>
            ) : (
              queue.map((request) => (
                <button
                  type="button"
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className={`w-full rounded-xl border p-4 text-start transition hover:border-primary ${
                    selectedRequest?.id === request.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {request.requester}{" "}
                      <span className="text-muted-foreground">
                        {request.id}
                      </span>
                    </p>
                    <Badge className={riskMeta[request.coverageRisk].className}>
                      {riskMeta[request.coverageRisk].label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {request.team}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {request.submittedAt}
                    </span>
                    <span>{request.duration}</span>
                  </div>
                  {request.notes && (
                    <p className="mt-2 text-sm">{request.notes}</p>
                  )}
                </button>
              ))
            )}
            {!isLoading && !error && queue.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {auto("No pending approvals right now.", "queue.empty")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{auto("Decision workspace", "detail.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Provide reasoning before syncing to payroll.",
                "detail.subtitle",
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedRequest ? (
              <>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    {selectedRequest.id}
                  </p>
                  <h3 className="text-lg font-semibold">
                    {selectedRequest.requester}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.team}
                  </p>
                </div>

                <div className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
                  <p>{selectedRequest.duration}</p>
                  <p>
                    {auto("Submitted", "detail.submitted")}:{" "}
                    {selectedRequest.submittedAt}
                  </p>
                </div>

                <div className="space-y-2 rounded-lg border border-border/70 p-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    {auto("Coverage note", "detail.coverageNote")}
                  </div>
                  <p>{selectedRequest.notes}</p>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline">
                    <X className="me-2 h-4 w-4" />
                    {auto("Decline", "detail.decline")}
                  </Button>
                  <Button className="flex-1">
                    <Check className="me-2 h-4 w-4" />
                    {auto("Approve & sync", "detail.approve")}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {auto("Select a request to review.", "detail.empty")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed border-border/70">
        <CardHeader>
          <CardTitle>
            {auto("Automation playbooks", "playbooks.title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto(
              "Documented guardrails for high-volume seasons.",
              "playbooks.subtitle",
            )}
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {playbooks.map((playbook) => (
            <div
              key={playbook.title}
              className="rounded-xl border border-border/70 p-4"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {playbook.status}
              </p>
              <h4 className="text-lg font-semibold">{playbook.title}</h4>
              <p className="text-sm text-muted-foreground">{playbook.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
