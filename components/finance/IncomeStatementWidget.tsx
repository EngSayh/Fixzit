"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/contexts/TranslationContext";
import { logger } from "@/lib/logger";

interface IncomeStatementResponse {
  from: string;
  to: string;
  revenue: number;
  expense: number;
  net: number;
  rows: Array<{
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
  }>;
}

export default function IncomeStatementWidget({
  initialYear = new Date().getFullYear(),
}: {
  initialYear?: number;
}) {
  const { t } = useTranslation();
  const [year, setYear] = useState(initialYear);
  const [data, setData] = useState<IncomeStatementResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/finance/reports/income-statement?year=${year}`,
      );
      if (res.status === 403) {
        setError(
          t(
            "finance.income.forbidden",
            "You do not have access to income statements.",
          ),
        );
        setData(null);
        return;
      }
      if (!res.ok) {
        throw new Error(
          t("finance.income.error", "Failed to load income statement"),
        );
      }
      const body = await res.json();
      setData(body);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.warn("Income statement fetch failed", {
        error: error.message,
        stack: error.stack,
      });
      setError(
        error.message ||
          t("finance.income.error", "Failed to load income statement"),
      );
    } finally {
      setLoading(false);
    }
  }, [year, t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{t("finance.income.title", "Income Statement")}</span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              className="h-8 w-24"
              value={year}
              onChange={(e) =>
                setYear(
                  parseInt(e.target.value || `${new Date().getFullYear()}`, 10),
                )
              }
            />
            <Button
              size="sm"
              variant="outline"
              onClick={load}
              disabled={loading}
              aria-label={t("finance.income.refresh", "Refresh income statement")}
              title={t("finance.income.refresh", "Refresh income statement")}
            >
              {t("common.refresh", "Refresh")}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {loading && <p>{t("common.loading", "Loading...")}</p>}
        {error && <p className="text-destructive">{error}</p>}
        {data && !loading && !error && (
          <div className="space-y-1">
            <p>
              {t("finance.income.period", "Period")}:{" "}
              {new Date(data.from).toLocaleDateString()} →{" "}
              {new Date(data.to).toLocaleDateString()}
            </p>
            <p className="font-semibold text-success">
              {t("finance.income.revenue", "Revenue")}:{" "}
              {data.revenue.toFixed(2)}
            </p>
            <p className="font-semibold text-destructive">
              {t("finance.income.expense", "Expenses")}:{" "}
              {data.expense.toFixed(2)}
            </p>
            <p>
              {t("finance.income.net", "Net Income")}:{" "}
              <strong>{data.net.toFixed(2)}</strong>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
