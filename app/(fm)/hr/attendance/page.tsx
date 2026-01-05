"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "@/components/ui/icons";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import ClientDate from "@/components/ClientDate";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { buildAttendanceCsv } from "@/lib/hr/attendance-export";

interface EmployeeOption {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

interface EmployeeApiItem {
  _id: string;
  employeeCode?: string;
  firstName?: string;
  lastName?: string;
}

interface EmployeesResponse {
  employees?: EmployeeApiItem[];
}

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "ON_LEAVE" | "OFF";

interface AttendanceEntry {
  _id: string;
  date: string;
  status: AttendanceStatus;
  clockIn?: string;
  clockOut?: string;
  overtimeMinutes?: number;
  source?: "MANUAL" | "IMPORT" | "BIOMETRIC";
  notes?: string;
}

export default function AttendancePage() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "ALL">(
    "ALL",
  );
  const [sourceFilter, setSourceFilter] = useState<
    "ALL" | "MANUAL" | "IMPORT" | "BIOMETRIC"
  >("ALL");
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
    };
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      void fetchAttendance();
    }
  }, [selectedEmployee, dateRange.from, dateRange.to]);

  const loadEmployees = async () => {
    try {
      const response = await fetch("/api/hr/employees?limit=200");
      if (response.ok) {
        const data: EmployeesResponse = await response.json();
        const mapped = (data.employees || []).map((employee) => ({
          _id: employee._id,
          employeeCode: employee.employeeCode ?? "",
          firstName: employee.firstName ?? "",
          lastName: employee.lastName ?? "",
        }));
        setEmployees(mapped);
        if (mapped.length > 0) {
          setSelectedEmployee(mapped[0]._id);
        }
      }
    } catch (error) {
      logger.error("Error fetching employee options:", error);
    }
  };

  const fetchAttendance = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        employeeId: selectedEmployee,
        from: dateRange.from,
        to: dateRange.to,
      });
      const response = await fetch(`/api/hr/attendance?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries || []);
      }
    } catch (error) {
      logger.error("Error loading attendance entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployeeObj = employees.find(
    (emp) => emp._id === selectedEmployee,
  );

  const attendanceStatusLabels: Record<
    AttendanceStatus,
    { key: string; fallback: string }
  > = {
    PRESENT: { key: "hr.attendance.status.present", fallback: "Present" },
    ABSENT: { key: "hr.attendance.status.absent", fallback: "Absent" },
    LATE: { key: "hr.attendance.status.late", fallback: "Late" },
    ON_LEAVE: { key: "hr.attendance.status.on_leave", fallback: "On Leave" },
    OFF: { key: "hr.attendance.status.off", fallback: "Off" },
  };

  const formatStatus = (status: AttendanceStatus) => {
    const config = attendanceStatusLabels[status];
    return t(config.key, config.fallback);
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const statusMatch =
        statusFilter === "ALL" || entry.status === statusFilter;
      const sourceMatch =
        sourceFilter === "ALL" || entry.source === sourceFilter;
      return statusMatch && sourceMatch;
    });
  }, [entries, sourceFilter, statusFilter]);

  const statusOptions: { value: AttendanceStatus | "ALL"; label: string }[] = [
    { value: "ALL", label: t("hr.attendance.filters.all", "All statuses") },
    { value: "PRESENT", label: t("hr.attendance.status.present", "Present") },
    { value: "ABSENT", label: t("hr.attendance.status.absent", "Absent") },
    { value: "LATE", label: t("hr.attendance.status.late", "Late") },
    {
      value: "ON_LEAVE",
      label: t("hr.attendance.status.on_leave", "On Leave"),
    },
    { value: "OFF", label: t("hr.attendance.status.off", "Off") },
  ];

  const sourceOptions: {
    value: "ALL" | "MANUAL" | "IMPORT" | "BIOMETRIC";
    label: string;
  }[] = [
    {
      value: "ALL",
      label: t("hr.attendance.filters.sourceAll", "All sources"),
    },
    {
      value: "MANUAL",
      label: t("hr.attendance.filters.sourceManual", "Manual"),
    },
    {
      value: "IMPORT",
      label: t("hr.attendance.filters.sourceImport", "Bulk import"),
    },
    {
      value: "BIOMETRIC",
      label: t("hr.attendance.filters.sourceBiometric", "Biometric device"),
    },
  ];
  const attendanceSourceLabels: Record<
    "MANUAL" | "IMPORT" | "BIOMETRIC",
    { key: string; fallback: string }
  > = {
    MANUAL: { key: "hr.attendance.filters.sourceManual", fallback: "Manual" },
    IMPORT: {
      key: "hr.attendance.filters.sourceImport",
      fallback: "Bulk import",
    },
    BIOMETRIC: {
      key: "hr.attendance.filters.sourceBiometric",
      fallback: "Biometric device",
    },
  };

  const handleExportCsv = () => {
    if (!filteredEntries.length) return;
    setExporting(true);
    try {
      const csv = buildAttendanceCsv(filteredEntries, {
        employeeCode: selectedEmployeeObj?.employeeCode,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance-${selectedEmployeeObj?.employeeCode || "employee"}-${dateRange.from}-${dateRange.to}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {t("hr.attendance.title", "Attendance & Time Tracking")}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t(
              "hr.attendance.subtitle",
              "Review daily attendance and overtime records",
            )}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={!filteredEntries.length || exporting}
          onClick={handleExportCsv}
          aria-label={t("hr.attendance.actions.exportCsvAria", "Export attendance to CSV")}
        >
          {exporting && <Loader2 className="h-4 w-4 animate-spin me-2" />}
          {t("hr.attendance.actions.exportCsv", "Export CSV")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              {t("hr.attendance.selectEmployee", "Select Employee")}
            </p>
            <Select
              value={selectedEmployee}
              onValueChange={(value) => setSelectedEmployee(value)}
              placeholder={t("hr.attendance.selectPlaceholder", "Choose employee")}
              className="w-full bg-muted border-input text-foreground"
            >
              {employees.map((employee) => (
                <SelectItem key={employee._id} value={employee._id}>
                  {employee.employeeCode} — {employee.firstName}{" "}
                  {employee.lastName}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="flex gap-4 flex-1 flex-wrap md:flex-nowrap">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                {t("hr.attendance.from", "From")}
              </p>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, from: e.target.value }))
                }
              />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                {t("hr.attendance.to", "To")}
              </p>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, to: e.target.value }))
                }
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                {t("hr.attendance.filters.status", "Status")}
              </p>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as AttendanceStatus | "ALL")
                }
                placeholder={t("hr.attendance.filters.status", "Status")}
                className="w-full bg-muted border-input text-foreground"
              >
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                {t("hr.attendance.filters.source", "Source")}
              </p>
              <Select
                value={sourceFilter}
                onValueChange={(value) =>
                  setSourceFilter(
                    value as "ALL" | "MANUAL" | "IMPORT" | "BIOMETRIC",
                  )
                }
                placeholder={t("hr.attendance.filters.source", "Source")}
                className="w-full bg-muted border-input text-foreground"
              >
                {sourceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-start">
                    {t("hr.attendance.table.date", "Date")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("hr.attendance.table.status", "Status")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("hr.attendance.table.clockIn", "Clock-in")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("hr.attendance.table.clockOut", "Clock-out")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("hr.attendance.table.overtime", "Overtime")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("hr.attendance.table.source", "Source")}
                  </th>
                  <th className="px-4 py-3 text-start">
                    {t("hr.attendance.table.notes", "Notes")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 text-center text-muted-foreground"
                    >
                      {t("common.loading", "Loading...")}
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 text-center text-muted-foreground"
                    >
                      {t(
                        "hr.attendance.empty",
                        "No attendance records for this range",
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry._id} className="border-b border-border/60">
                      <td className="px-4 py-3 font-medium">
                        <ClientDate date={entry.date} format="date-only" />
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {formatStatus(entry.status)}
                      </td>
                      <td className="px-4 py-3">
                        {entry.clockIn ? (
                          <ClientDate date={entry.clockIn} format="time-only" />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {entry.clockOut ? (
                          <ClientDate
                            date={entry.clockOut}
                            format="time-only"
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {entry.overtimeMinutes
                          ? `${entry.overtimeMinutes} ${t("hr.attendance.minutes", "min")}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {entry.source
                          ? t(
                              attendanceSourceLabels[entry.source]?.key ??
                                "hr.attendance.filters.sourceAll",
                              attendanceSourceLabels[entry.source]?.fallback ??
                                entry.source.toLowerCase(),
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {entry.notes?.trim() || "—"}
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
