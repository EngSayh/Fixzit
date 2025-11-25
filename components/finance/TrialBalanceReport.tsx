"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { logger } from "@/lib/logger";

// ============================================================================
// INTERFACES
// ============================================================================

interface ITrialBalanceAccount {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number;
  level: number;
  hasChildren: boolean;
}

interface ITrialBalanceData {
  year: number;
  period: number;
  asOfDate: string;
  accounts: ITrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  difference: number;
}

const ACCOUNT_TYPE_LABELS: Record<string, { key: string; fallback: string }> = {
  ASSET: { key: "finance.accountType.ASSET", fallback: "Asset" },
  LIABILITY: { key: "finance.accountType.LIABILITY", fallback: "Liability" },
  EQUITY: { key: "finance.accountType.EQUITY", fallback: "Equity" },
  REVENUE: { key: "finance.accountType.REVENUE", fallback: "Revenue" },
  EXPENSE: { key: "finance.accountType.EXPENSE", fallback: "Expense" },
};

interface ITrialBalanceReportProps {
  initialYear?: number;
  initialPeriod?: number;
  onExport?: (data: ITrialBalanceData) => void;
}

// Constants
const API_ENDPOINT = "/api/finance/ledger/trial-balance";

export default function TrialBalanceReport({
  initialYear = new Date().getFullYear(),
  initialPeriod = new Date().getMonth() + 1,
  onExport,
}: ITrialBalanceReportProps) {
  const { t, locale } = useTranslation();

  // Filter state
  const [year, setYear] = useState<number>(initialYear);
  const [period, setPeriod] = useState<number>(initialPeriod);
  const [showZeroBalances, setShowZeroBalances] = useState<boolean>(false);
  const [groupByType, setGroupByType] = useState<boolean>(true);

  // Data state
  const [data, setData] = useState<ITrialBalanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const getAccountTypeLabel = useCallback(
    (type: string) => {
      const entry = ACCOUNT_TYPE_LABELS[type] ?? {
        key: `finance.accountType.${type}`,
        fallback: type,
      };
      return t(entry.key, entry.fallback);
    },
    [t],
  );

  // UI state
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(
    new Set(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
  );

  // Removed unused DEFAULT_TIMEZONE constant

  const loadTrialBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        year: year.toString(),
        period: period.toString(),
      });

      const response = await fetch(`${API_ENDPOINT}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(
          t("finance.trialBalance.error.load", "Failed to load trial balance"),
        );
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      import("../../lib/logger")
        .then(({ logError }) => {
          logError("Error loading trial balance", err as Error, {
            component: "TrialBalanceReport",
            action: "loadData",
            year,
            period,
          });
        })
        .catch((logErr) =>
          logger.error("Failed to load logger:", { error: logErr }),
        );
      setError(
        err instanceof Error
          ? err.message
          : t("common.error.loadData", "Failed to load data"),
      );
    } finally {
      setLoading(false);
    }
  }, [year, period, t]);

  useEffect(() => {
    loadTrialBalance();
  }, [loadTrialBalance]);

  // ============================================================================
  // DATA FILTERING & GROUPING
  // ============================================================================

  const getFilteredAccounts = (): ITrialBalanceAccount[] => {
    if (!data) return [];
    let accounts = data.accounts;
    if (!showZeroBalances) {
      accounts = accounts.filter((acc) => Math.abs(acc.balance) > 0.01);
    }
    return accounts;
  };

  const getAccountsByType = (): Record<string, ITrialBalanceAccount[]> => {
    const filtered = getFilteredAccounts();
    const grouped: Record<string, ITrialBalanceAccount[]> = {};
    filtered.forEach((acc) => {
      if (!grouped[acc.accountType]) {
        grouped[acc.accountType] = [];
      }
      grouped[acc.accountType].push(acc);
    });
    return grouped;
  };

  // ============================================================================
  // TYPE EXPANSION
  // ============================================================================

  const toggleTypeExpansion = (type: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  const expandAll = () => {
    if (data) {
      const allTypes = new Set<string>();
      data.accounts.forEach((acc) => allTypes.add(acc.accountType));
      setExpandedTypes(allTypes);
    }
  };

  const collapseAll = () => {
    setExpandedTypes(new Set());
  };

  // ============================================================================
  // EXPORT FUNCTIONALITY
  // ============================================================================

  const exportToCSV = () => {
    if (!data) return;

    const headers = [
      t("tb.col.code", "Account Code"),
      t("tb.col.name", "Account Name"),
      t("tb.col.type", "Type"),
      t("tb.col.debit", "Debit"),
      t("tb.col.credit", "Credit"),
      t("tb.col.balance", "Balance"),
    ];

    const rows = data.accounts.map((acc) => [
      acc.accountCode,
      acc.accountName,
      acc.accountType,
      acc.debit.toFixed(2),
      acc.credit.toFixed(2),
      acc.balance.toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trial-balance-${year}-${period}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleExport = (format: "csv" | "excel") => {
    if (!data) return;
    if (onExport) {
      onExport(data);
      return;
    }
    if (format === "csv") {
      exportToCSV();
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderAccountRow = (account: ITrialBalanceAccount) => {
    const indent = account.level * 20;
    return (
      <tr
        key={account.accountId}
        className="hover:bg-muted border-b border-border"
      >
        <td
          className="px-4 py-2 text-sm"
          style={{ paddingLeft: `${16 + indent}px` }}
        >
          <span
            className={
              account.level > 0
                ? "text-muted-foreground"
                : "font-medium text-foreground"
            }
          >
            {account.accountCode}
          </span>
        </td>
        <td className="px-4 py-2 text-sm">
          <span
            className={
              account.level > 0
                ? "text-foreground"
                : "font-medium text-foreground"
            }
          >
            {account.accountName}
          </span>
        </td>
        <td className="px-4 py-2 text-sm text-end text-success-dark">
          {account.debit > 0 ? account.debit.toFixed(2) : "-"}
        </td>
        <td className="px-4 py-2 text-sm text-end text-destructive-dark">
          {account.credit > 0 ? account.credit.toFixed(2) : "-"}
        </td>
        <td className="px-4 py-2 text-sm text-end font-medium text-foreground">
          {account.balance.toFixed(2)}
        </td>
      </tr>
    );
  };

  const renderGroupedAccounts = () => {
    const grouped = getAccountsByType();
    const types = Object.keys(grouped).sort();

    return types.map((type) => {
      const accounts = grouped[type];
      const typeTotal = accounts.reduce((sum, acc) => sum + acc.balance, 0);
      const typeDebits = accounts.reduce((sum, acc) => sum + acc.debit, 0);
      const typeCredits = accounts.reduce((sum, acc) => sum + acc.credit, 0);
      const isExpanded = expandedTypes.has(type);

      return (
        <React.Fragment key={type}>
          <tr
            className="bg-muted border-t-2 border-border cursor-pointer hover:bg-muted/80"
            onClick={() => toggleTypeExpansion(type)}
          >
            <td colSpan={2} className="px-4 py-3 font-bold text-foreground">
              {isExpanded ? (
                <ChevronDown className="inline-block me-2 w-4 h-4" />
              ) : (
                <ChevronRight className="inline-block me-2 w-4 h-4" />
              )}
              {getAccountTypeLabel(type)}
            </td>
            <td className="px-4 py-3 font-bold text-end text-foreground">
              {typeDebits.toFixed(2)}
            </td>
            <td className="px-4 py-3 font-bold text-end text-foreground">
              {typeCredits.toFixed(2)}
            </td>
            <td className="px-4 py-3 font-bold text-end text-foreground">
              {typeTotal.toFixed(2)}
            </td>
          </tr>

          {isExpanded && accounts.map((account) => renderAccountRow(account))}
        </React.Fragment>
      );
    });
  };

  const renderFlatAccounts = () => {
    const accounts = getFilteredAccounts();
    return accounts.map((account) => renderAccountRow(account));
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* ✅ FIX: Use standard Card and components */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-2xl font-bold">
              {t("finance.trialBalance.title", "Trial Balance Report")}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv")}
              disabled={!data || loading}
            >
              <Download className="w-4 h-4 me-2" />
              {t("common.exportCsv", "Export CSV")}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={loadTrialBalance}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 me-2" />
              )}
              {loading
                ? t("common.loading", "Loading...")
                : t("common.refresh", "Refresh")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="fiscal-year">
                {t("finance.fiscalYear", "Fiscal Year")}
              </Label>
              <Select
                id="fiscal-year"
                value={String(year)}
                onValueChange={(v) => setYear(parseInt(v, 10))}
                disabled={loading}
                placeholder={t("finance.selectYear", "Select year")}
              >
                {[...Array(5)].map((_, i) => {
                  const y = new Date().getFullYear() - i;
                  return (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  );
                })}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">{t("finance.period", "Period")}</Label>
              <Select
                id="period"
                value={String(period)}
                onValueChange={(v) => setPeriod(parseInt(v, 10))}
                disabled={loading}
                placeholder={t("finance.selectPeriod", "Select period")}
              >
                {[...Array(12)].map((_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {new Date(2000, i).toLocaleString(locale, {
                      month: "long",
                    })}{" "}
                    ({i + 1})
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="flex items-end pb-2">
              <Label
                htmlFor="show-zero"
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-border p-3 hover:bg-muted flex-1"
              >
                <span className="text-sm font-medium">
                  {t("finance.showZero", "Show Zero Balances")}
                </span>
                <Switch
                  id="show-zero"
                  checked={showZeroBalances}
                  onCheckedChange={setShowZeroBalances}
                  aria-label={t("finance.showZero", "Show Zero Balances")}
                />
              </Label>
            </div>

            <div className="flex items-end pb-2">
              <Label
                htmlFor="group-by-type"
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-border p-3 hover:bg-muted flex-1"
              >
                <span className="text-sm font-medium">
                  {t("finance.groupByType", "Group by Type")}
                </span>
                <Switch
                  id="group-by-type"
                  checked={groupByType}
                  onCheckedChange={setGroupByType}
                  aria-label={t("finance.groupByType", "Group by Type")}
                />
              </Label>
            </div>
          </div>

          {groupByType && data && (
            <div className="flex gap-2 border-t pt-4">
              <Button variant="outline" size="sm" onClick={expandAll}>
                {t("common.expandAll", "Expand All")}
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                {t("common.collapseAll", "Collapse All")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="bg-destructive/10 border-destructive/20">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <CardTitle className="text-destructive">
              {t("common.error", "Error")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-dark">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">
              {t("finance.trialBalance.loading", "Loading trial balance...")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Trial Balance Table */}
      {!loading && data && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("finance.trialBalance.title", "Trial Balance")}
            </CardTitle>
            <CardDescription>
              {t("common.asOf", "As of")} {data.asOfDate} |{" "}
              {t("finance.period", "Period")} {period}/{year}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("tb.col.code", "Account Code")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("tb.col.name", "Account Name")}
                  </th>
                  <th className="px-4 py-3 text-end text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("tb.col.debit", "Debit")}
                  </th>
                  <th className="px-4 py-3 text-end text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("tb.col.credit", "Credit")}
                  </th>
                  <th className="px-4 py-3 text-end text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("tb.col.balance", "Balance")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {groupByType ? renderGroupedAccounts() : renderFlatAccounts()}
              </tbody>
              <tfoot className="bg-muted border-t-2 border-border">
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-3 text-sm font-bold text-foreground"
                  >
                    {t("common.total", "TOTAL")}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-end text-foreground">
                    {data.totalDebits.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-end text-foreground">
                    {data.totalCredits.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-end text-foreground">
                    {(data.totalDebits - data.totalCredits).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-4 pt-4">
            {/* Balance Status */}
            <div
              className={`p-4 rounded-lg flex items-start gap-3 ${data.isBalanced ? "bg-success/10" : "bg-destructive/10"}`}
            >
              <div className="flex-shrink-0">
                {data.isBalanced ? (
                  <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`font-semibold ${data.isBalanced ? "text-success-dark" : "text-destructive-dark"}`}
                >
                  {data.isBalanced
                    ? t(
                        "finance.trialBalance.balanced",
                        "Trial Balance is Balanced",
                      )
                    : t(
                        "finance.trialBalance.unbalanced",
                        "Trial Balance is Out of Balance",
                      )}
                </p>
                {!data.isBalanced && (
                  <p className="text-sm text-destructive-dark mt-1">
                    {t("finance.trialBalance.difference", "Difference")}:{" "}
                    {Math.abs(data.difference).toFixed(2)}
                  </p>
                )}
              </div>
              <div className="text-end text-sm text-muted-foreground">
                <p>
                  {t("finance.totalAccounts", "Total Accounts")}:{" "}
                  {data.accounts.length}
                </p>
                <p>
                  {t("finance.displayed", "Displayed")}:{" "}
                  {getFilteredAccounts().length}
                </p>
              </div>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !data && !error && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              {t(
                "finance.trialBalance.noData",
                "No trial balance data available",
              )}
            </p>
            <Button variant="default" onClick={loadTrialBalance}>
              {t("finance.trialBalance.loadData", "Load Trial Balance")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
