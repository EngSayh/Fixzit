"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X, CalendarPlus } from "@/components/ui/icons";
import ClientDate from "@/components/ClientDate";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

interface LeaveRequest {
  _id: string;
  employeeId: {
    _id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  };
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  status: LeaveStatus;
  reason?: string;
}

interface EmployeeOption {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

interface LeaveTypeOption {
  _id: string;
  code: string;
  name: string;
  isPaid: boolean;
  annualEntitlementDays?: number;
}

export default function LeavePage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | LeaveStatus>("ALL");
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [leaveTypesLoading, setLeaveTypesLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    numberOfDays: 1,
    reason: "",
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const leaveStatusLabels: Record<
    LeaveStatus,
    { key: string; fallback: string }
  > = {
    PENDING: { key: "hr.leave.status.pending", fallback: "Pending" },
    APPROVED: { key: "hr.leave.status.approved", fallback: "Approved" },
    REJECTED: { key: "hr.leave.status.rejected", fallback: "Rejected" },
    CANCELLED: { key: "hr.leave.status.cancelled", fallback: "Cancelled" },
  };

  useEffect(() => {
    void fetchRequests();
    void fetchEmployees();
    void fetchLeaveTypes();
  }, []);

  const fetchRequests = async (status?: LeaveStatus) => {
    try {
      const query = status ? `?status=${status}` : "";
      const response = await fetch(`/api/hr/leaves${query}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      logger.error("Error loading leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (value: "ALL" | LeaveStatus) => {
    setFilter(value);
    setLoading(true);
    void fetchRequests(value === "ALL" ? undefined : value);
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case "APPROVED":
        return "bg-success/10 text-success border-success/30";
      case "PENDING":
        return "bg-warning/10 text-warning border-warning/30";
      case "REJECTED":
      case "CANCELLED":
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  const filteredRequests = useMemo(() => {
    if (filter === "ALL") return requests;
    return requests.filter((req) => req.status === filter);
  }, [requests, filter]);

  const analytics = useMemo(() => {
    const statusCounts: Record<LeaveStatus, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };
    let totalDays = 0;
    requests.forEach((request) => {
      statusCounts[request.status] += 1;
      totalDays += request.numberOfDays || 0;
    });
    const avgDuration = requests.length ? totalDays / requests.length : 0;
    const upcoming = [...requests]
      .filter((req) => new Date(req.startDate) >= new Date())
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      )[0];
    return {
      statusCounts,
      avgDuration,
      upcoming,
    };
  }, [requests]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/hr/employees?limit=200");
      if (response.ok) {
        const data = await response.json();
        setEmployees(Array.isArray(data.employees) ? data.employees : []);
      }
    } catch (error) {
      logger.error("Error loading employees for leave form:", error);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      setLeaveTypesLoading(true);
      const response = await fetch("/api/hr/leave-types?limit=200");
      if (response.ok) {
        const data = await response.json();
        setLeaveTypes(Array.isArray(data.leaveTypes) ? data.leaveTypes : []);
      }
    } catch (error) {
      logger.error("Error loading leave types:", error);
    } finally {
      setLeaveTypesLoading(false);
    }
  };

  const handleFormChange = (field: string, value: string) => {
    const next = {
      ...formData,
      [field]: field === "numberOfDays" ? Number(value) : value,
    };
    if (
      (field === "startDate" || field === "endDate") &&
      next.startDate &&
      next.endDate
    ) {
      const start = new Date(next.startDate);
      const end = new Date(next.endDate);
      if (
        !Number.isNaN(start.getTime()) &&
        !Number.isNaN(end.getTime()) &&
        end >= start
      ) {
        const diff =
          Math.floor(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
          ) + 1;
        next.numberOfDays = diff;
      }
    }
    setFormData(next);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.employeeId ||
      !formData.leaveTypeId ||
      !formData.startDate ||
      !formData.endDate
    ) {
      toast.error(
        t(
          "hr.leave.form.validation.required",
          "Please fill all required fields.",
        ),
      );
      return;
    }
    setFormSubmitting(true);
    try {
      const response = await fetch("/api/hr/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to create leave request");
      }
      toast.success(t("hr.leave.form.success", "Leave request created"));
      setFormData({
        employeeId: "",
        leaveTypeId: "",
        startDate: "",
        endDate: "",
        numberOfDays: 1,
        reason: "",
      });
      setFormOpen(false);
      await fetchRequests(filter === "ALL" ? undefined : filter);
    } catch (error) {
      logger.error("Error creating leave request", { error });
      toast.error(
        t(
          "hr.leave.form.error",
          "Unable to create leave request. Please try again.",
        ),
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStatusUpdate = async (
    leaveRequestId: string,
    status: Exclude<LeaveStatus, "PENDING">,
  ) => {
    setActionLoading(`${leaveRequestId}-${status}`);
    try {
      const response = await fetch("/api/hr/leaves", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leaveRequestId, status }),
      });
      if (!response.ok) {
        throw new Error(`Failed to update status (${response.status})`);
      }
      await fetchRequests(filter === "ALL" ? undefined : filter);
    } catch (error) {
      logger.error("Failed to update leave status", { error });
      alert(
        t(
          "hr.leave.actions.error",
          "Unable to update leave request. Please try again.",
        ),
      );
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {t("hr.leave.title", "Leave Management")}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t(
              "hr.leave.subtitle",
              "Track and approve employee leave requests",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setFormOpen((prev) => !prev)}
            aria-label={t("hr.leave.actions.newRequest", "New Leave Request")}
          >
            <CalendarPlus className="h-4 w-4 me-2" />
            {t("hr.leave.actions.newRequest", "New Leave Request")}
          </Button>
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map(
            (status) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange(status)}
                aria-label={status === "ALL"
                  ? t("hr.leave.filter.all", "All")
                  : t(
                      leaveStatusLabels[status].key,
                      leaveStatusLabels[status].fallback,
                    )}
              >
                {status === "ALL"
                  ? t("hr.leave.filter.all", "All")
                  : t(
                      leaveStatusLabels[status].key,
                      leaveStatusLabels[status].fallback,
                    )}
              </Button>
            ),
          )}
        </div>
      </div>

      {requests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("hr.leave.analytics.pending", "Pending approval")}
              </p>
              <p className="text-3xl font-semibold mt-2">
                {analytics.statusCounts.PENDING}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("hr.leave.analytics.approved", "Approved this month")}
              </p>
              <p className="text-3xl font-semibold mt-2 text-success">
                {analytics.statusCounts.APPROVED}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("hr.leave.analytics.avgDuration", "Average duration")}
              </p>
              <p className="text-3xl font-semibold mt-2">
                {analytics.avgDuration.toFixed(1)}{" "}
                <span className="text-base text-muted-foreground">
                  {t("hr.leave.analytics.days", "days")}
                </span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("hr.leave.analytics.upcoming", "Next upcoming leave")}
              </p>
              {analytics.upcoming ? (
                <div className="mt-2">
                  <p className="text-base font-semibold text-foreground">
                    {analytics.upcoming.employeeId.firstName}{" "}
                    {analytics.upcoming.employeeId.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <ClientDate
                      date={analytics.upcoming.startDate}
                      format="date-only"
                    />
                    <span>→</span>
                    <ClientDate
                      date={analytics.upcoming.endDate}
                      format="date-only"
                    />
                  </p>
                </div>
              ) : (
                <p className="text-base text-muted-foreground mt-2">
                  {t("hr.leave.analytics.noneUpcoming", "No upcoming leave")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {formOpen && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("hr.leave.form.title", "Create Leave Request")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              onSubmit={handleCreateRequest}
            >
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  {t("hr.leave.form.employee", "Employee")}
                </label>
                <select
                  className="w-full rounded-2xl border border-border px-3 py-2 bg-background"
                  value={formData.employeeId}
                  onChange={(e) =>
                    handleFormChange("employeeId", e.target.value)
                  }
                  required
                >
                  <option value="">
                    {t("hr.leave.form.selectEmployee", "Select employee")}
                  </option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.employeeCode} — {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center justify-between gap-2">
                  <span>{t("hr.leave.form.leaveType", "Leave Type")}</span>
                  {!leaveTypesLoading && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline underline-offset-2"
                      onClick={() => fetchLeaveTypes()}
                      aria-label={t("hr.leave.form.leaveTypeRefresh", "Refresh")}
                    >
                      {t("hr.leave.form.leaveTypeRefresh", "Refresh")}
                    </button>
                  )}
                </label>
                {leaveTypes.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
                    {leaveTypesLoading
                      ? t(
                          "hr.leave.form.leaveTypeLoading",
                          "Loading leave types...",
                        )
                      : t(
                          "hr.leave.form.leaveTypeEmpty",
                          "No leave types configured yet. Add them from HR settings or ask an admin.",
                        )}
                  </div>
                ) : (
                  <Select
                    value={formData.leaveTypeId}
                    onValueChange={(value) =>
                      handleFormChange("leaveTypeId", value)
                    }
                    placeholder={t(
                      "hr.leave.form.leaveTypePlaceholder",
                      "Select leave type",
                    )}
                    className="w-full sm:w-40 bg-muted border-input text-foreground"
                  >
                    <SelectTrigger>
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((type) => (
                        <SelectItem key={type._id} value={type._id}>
                          {type.name} ({type.code})
                          {typeof type.annualEntitlementDays === "number"
                            ? ` • ${type.annualEntitlementDays}${t("hr.leave.form.leaveTypeDaysSuffix", "d")}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  {t(
                    "hr.leave.form.leaveTypeHelper",
                    "Leave type controls balances, paid vs unpaid days, and approval routing.",
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  {t("hr.leave.form.startDate", "Start Date")}
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    handleFormChange("startDate", e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  {t("hr.leave.form.endDate", "End Date")}
                </label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleFormChange("endDate", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  {t("hr.leave.form.days", "Number of days")}
                </label>
                <Input
                  type="number"
                  min={1}
                  value={formData.numberOfDays}
                  onChange={(e) =>
                    handleFormChange("numberOfDays", e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-muted-foreground">
                  {t("hr.leave.form.reason", "Reason (optional)")}
                </label>
                <Textarea
                  rows={3}
                  placeholder={t(
                    "hr.leave.form.reasonPlaceholder",
                    "Provide additional context",
                  )}
                  value={formData.reason}
                  onChange={(e) => handleFormChange("reason", e.target.value)}
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setFormOpen(false)}
                  aria-label={t("common.cancel", "Cancel")}
                >
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={formSubmitting} aria-label={t("hr.leave.form.submit", "Create Request")}>
                  {formSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                  )}
                  {t("hr.leave.form.submit", "Create Request")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              {t("hr.leave.empty", "No leave requests found for this filter")}
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request._id}>
              <CardContent className="p-6 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {request.employeeId.employeeCode}
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {request.employeeId.firstName}{" "}
                      {request.employeeId.lastName}
                    </p>
                  </div>
                  <Badge className={getStatusBadge(request.status)}>
                    {t(
                      leaveStatusLabels[request.status].key,
                      leaveStatusLabels[request.status].fallback,
                    )}
                  </Badge>
                </div>
                {request.status === "PENDING" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-success hover:bg-success/90 text-white"
                      onClick={() =>
                        handleStatusUpdate(request._id, "APPROVED")
                      }
                      disabled={Boolean(actionLoading)}
                      aria-label={t("hr.leave.actions.approve", "Approve")}
                    >
                      {actionLoading === `${request._id}-APPROVED` ? (
                        <Loader2 className="h-4 w-4 animate-spin me-2" />
                      ) : (
                        <Check className="h-4 w-4 me-2" />
                      )}
                      {t("hr.leave.actions.approve", "Approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        handleStatusUpdate(request._id, "REJECTED")
                      }
                      disabled={Boolean(actionLoading)}
                      aria-label={t("hr.leave.actions.reject", "Reject")}
                    >
                      {actionLoading === `${request._id}-REJECTED` ? (
                        <Loader2 className="h-4 w-4 animate-spin me-2" />
                      ) : (
                        <X className="h-4 w-4 me-2" />
                      )}
                      {t("hr.leave.actions.reject", "Reject")}
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">
                      {t("hr.leave.start", "Start")}
                    </p>
                    <p className="font-medium">
                      <ClientDate date={request.startDate} format="date-only" />
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      {t("hr.leave.end", "End")}
                    </p>
                    <p className="font-medium">
                      <ClientDate date={request.endDate} format="date-only" />
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      {t("hr.leave.days", "Days")}
                    </p>
                    <p className="font-medium">{request.numberOfDays}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      {t("hr.leave.reason", "Reason")}
                    </p>
                    <p className="font-medium">
                      {request.reason || t("common.notAvailable", "N/A")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
