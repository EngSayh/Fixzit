"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, Download, Eye, Plus, FileText } from "lucide-react";
import ClientDate from "@/components/ClientDate";
import { logger } from "@/lib/logger";

type PayrollStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "LOCKED" | "EXPORTED";

interface Totals {
  baseSalary: number;
  allowances: number;
  overtime: number;
  deductions: number;
  gosi: number;
  net: number;
}

interface PayrollRun {
  _id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: PayrollStatus;
  employeeCount: number;
  totals: Totals;
  calculatedAt?: string;
  lines?: PayrollLine[];
  exportReference?: string;
}

interface PayrollLine {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  iban?: string;
  baseSalary: number;
  allowances: number;
  overtimeHours?: number;
  overtimeAmount?: number;
  deductions: number;
  gosiContribution?: number;
  netPay: number;
  currency?: string;
  notes?: string;
}

export default function PayrollPage() {
  const { t } = useTranslation();
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  useEffect(() => {
    void fetchPayrollRuns();
  }, []);

  const fetchPayrollRuns = async () => {
    try {
      const response = await fetch("/api/hr/payroll/runs");
      if (!response.ok) return;
      const data = await response.json();
      setPayrollRuns(data.runs || []);
    } catch (error) {
      logger.error("Error fetching payroll runs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async (runId: string) => {
    try {
      const response = await fetch(`/api/hr/payroll/runs/${runId}/calculate`, {
        method: "POST",
      });
      if (response.ok) {
        await fetchPayrollRuns();
      }
    } catch (error) {
      logger.error("Error calculating payroll:", error);
    }
  };

  const handleExportWPS = async (runId: string) => {
    try {
      const response = await fetch(`/api/hr/payroll/runs/${runId}/export/wps`);
      if (!response.ok) return;
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `payroll_${runId}_wps.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logger.error("Error exporting WPS file:", error);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (typeof amount !== "number") return "-";
    return new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPeriod = (run: PayrollRun) => {
    return `${new Intl.DateTimeFormat("en", {
      month: "long",
      year: "numeric",
    }).format(new Date(run.periodStart))}`;
  };

  const getStatusBadge = (status: PayrollStatus) => {
    const base = "border px-3 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "DRAFT":
        return `${base} bg-muted text-foreground border-border`;
      case "IN_REVIEW":
        return `${base} bg-primary/10 text-primary border-primary/30`;
      case "APPROVED":
        return `${base} bg-success/10 text-success border-success/30`;
      case "LOCKED":
      case "EXPORTED":
        return `${base} bg-secondary/10 text-secondary border-secondary/30`;
      default:
        return `${base} bg-muted text-foreground border-border`;
    }
  };

  const formatStatusLabel = (status: PayrollStatus) => {
    const key = `hr.payroll.status.${status.toLowerCase()}`;
    const fallback = status
      .replace("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
    return t(key, fallback);
  };

  useEffect(() => {
    if (payrollRuns.length === 0) {
      setSelectedRunId(null);
      return;
    }
    if (!selectedRunId) {
      setSelectedRunId(payrollRuns[0]._id);
    } else if (!payrollRuns.some((run) => run._id === selectedRunId)) {
      setSelectedRunId(payrollRuns[0]._id);
    }
  }, [payrollRuns, selectedRunId]);

  const selectedRun = useMemo(() => {
    if (!payrollRuns.length) return null;
    const match = payrollRuns.find((run) => run._id === selectedRunId);
    return match || payrollRuns[0];
  }, [payrollRuns, selectedRunId]);

  const earningsTotals = useMemo(() => {
    if (!selectedRun?.totals) return { earnings: 0, deductions: 0 };
    const earnings =
      (selectedRun.totals.baseSalary || 0) +
      (selectedRun.totals.allowances || 0) +
      (selectedRun.totals.overtime || 0);
    const deductions =
      (selectedRun.totals.deductions || 0) + (selectedRun.totals.gosi || 0);
    return { earnings, deductions };
  }, [selectedRun]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">
            {t("common.loading", "Loading...")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {t("hr.payroll.title", "Payroll Management")}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t("hr.payroll.subtitle", "Create and manage monthly payroll runs")}
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary text-white">
          <Plus className="h-4 w-4 me-2" />
          {t("hr.payroll.createNew", "Create New Run")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {payrollRuns.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground text-5xl mb-4">💰</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t("hr.payroll.noRuns", "No payroll runs yet")}
              </h3>
              <p className="text-muted-foreground">
                {t(
                  "hr.payroll.noRunsDesc",
                  "Create your first payroll run to get started",
                )}
              </p>
            </CardContent>
          </Card>
        ) : (
          payrollRuns.map((run) => (
            <Card key={run._id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">
                      {formatPeriod(run)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {run.employeeCount}{" "}
                      {t("hr.payroll.employees", "employees")}
                    </p>
                  </div>
                  <span className={getStatusBadge(run.status)}>
                    {formatStatusLabel(run.status)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {run.totals && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("hr.payroll.basicPay", "Basic Pay")}
                      </p>
                      <p className="text-lg font-semibold mt-1">
                        {formatCurrency(run.totals.baseSalary)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("hr.payroll.allowances", "Allowances")}
                      </p>
                      <p className="text-lg font-semibold mt-1 text-success">
                        +
                        {formatCurrency(
                          run.totals.allowances + run.totals.overtime,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("hr.payroll.deductions", "Deductions")}
                      </p>
                      <p className="text-lg font-semibold mt-1 text-destructive">
                        -
                        {formatCurrency(
                          run.totals.deductions + run.totals.gosi,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("hr.payroll.netPay", "Net Pay")}
                      </p>
                      <p className="text-lg font-semibold mt-1">
                        {formatCurrency(run.totals.net)}
                      </p>
                    </div>
                    {run.calculatedAt && (
                      <div className="text-xs text-muted-foreground">
                        {t("hr.payroll.calculatedAt", "Calculated at")}{" "}
                        <ClientDate date={run.calculatedAt} format="medium" />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCalculate(run._id)}
                  >
                    <Calculator className="h-4 w-4 me-2" />
                    {t("hr.payroll.actions.recalculate", "Recalculate")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportWPS(run._id)}
                  >
                    <Download className="h-4 w-4 me-2" />
                    {t("hr.payroll.actions.export", "Export WPS")}
                  </Button>
                  <Button
                    variant={selectedRun?._id === run._id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedRunId(run._id)}
                  >
                    <Eye className="h-4 w-4 me-2" />
                    {selectedRun?._id === run._id
                      ? t("hr.payroll.actions.viewing", "Viewing")
                      : t("hr.payroll.actions.viewDetails", "View details")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedRun && (
        <Card className="border-primary/30 shadow-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-muted-foreground">
                  {t("hr.payroll.detail.title", "Run Details")}
                </p>
                <CardTitle className="text-2xl mt-1 text-primary">
                  {selectedRun.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  <ClientDate
                    date={selectedRun.periodStart}
                    format="date-only"
                  />{" "}
                  —{" "}
                  <ClientDate date={selectedRun.periodEnd} format="date-only" />
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCalculate(selectedRun._id)}
                >
                  <Calculator className="h-4 w-4 me-2" />
                  {t("hr.payroll.actions.recalculate", "Recalculate")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportWPS(selectedRun._id)}
                >
                  <Download className="h-4 w-4 me-2" />
                  {t("hr.payroll.actions.export", "Export WPS")}
                </Button>
                <Button variant="outline" size="sm" disabled>
                  <FileText className="h-4 w-4 me-2" />
                  {t("hr.payroll.actions.postFinance", "Post to finance")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border/60 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("hr.payroll.detail.totalEarnings", "Gross earnings")}
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {formatCurrency(earningsTotals.earnings)}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("hr.payroll.detail.totalDeductions", "Total deductions")}
                </p>
                <p className="mt-2 text-2xl font-semibold text-destructive">
                  -{formatCurrency(earningsTotals.deductions)}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("hr.payroll.detail.netPay", "Net payable")}
                </p>
                <p className="mt-2 text-2xl font-semibold text-primary">
                  {formatCurrency(selectedRun.totals?.net)}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("hr.payroll.detail.calculatedAt", "Calculated at")}
                </p>
                <p className="mt-2 text-base font-medium">
                  {selectedRun.calculatedAt ? (
                    <ClientDate
                      date={selectedRun.calculatedAt}
                      format="medium"
                    />
                  ) : (
                    t("common.notAvailable", "N/A")
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  {t("hr.payroll.detail.linesTitle", "Employee payouts")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedRun.employeeCount}{" "}
                  {t("hr.payroll.detail.linesCount", "employees in this run")}
                </p>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 text-start">
                        {t("hr.payroll.detail.table.employee", "Employee")}
                      </th>
                      <th className="px-4 py-3 text-start">
                        {t("hr.payroll.detail.table.iban", "IBAN")}
                      </th>
                      <th className="px-4 py-3 text-start">
                        {t("hr.payroll.detail.table.earnings", "Earnings")}
                      </th>
                      <th className="px-4 py-3 text-start">
                        {t("hr.payroll.detail.table.deductions", "Deductions")}
                      </th>
                      <th className="px-4 py-3 text-start">
                        {t("hr.payroll.detail.table.net", "Net pay")}
                      </th>
                      <th className="px-4 py-3 text-start">
                        {t("hr.payroll.detail.table.notes", "Notes")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedRun.lines || []).map((line) => (
                      <tr
                        key={line.employeeId}
                        className="border-b border-border/40"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">
                            {line.employeeName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {line.employeeCode}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {line.iban || t("common.notAvailable", "N/A")}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatCurrency(
                            (line.baseSalary || 0) +
                              (line.allowances || 0) +
                              (line.overtimeAmount || 0),
                          )}
                        </td>
                        <td className="px-4 py-3 text-destructive">
                          -
                          {formatCurrency(
                            (line.deductions || 0) +
                              (line.gosiContribution || 0),
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">
                          {formatCurrency(line.netPay)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {line.notes?.trim() || "—"}
                        </td>
                      </tr>
                    ))}
                    {(!selectedRun.lines || selectedRun.lines.length === 0) && (
                      <tr>
                        <td
                          className="px-4 py-6 text-center text-muted-foreground"
                          colSpan={6}
                        >
                          {t(
                            "hr.payroll.detail.noLines",
                            "Run has no calculated employees yet.",
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedRun.exportReference && (
              <div className="rounded-xl border border-border/60 p-4 bg-muted/40 text-sm">
                <p className="font-semibold text-foreground">
                  {t("hr.payroll.detail.exportRef", "Finance export reference")}
                </p>
                <p className="text-muted-foreground mt-1">
                  {selectedRun.exportReference}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
