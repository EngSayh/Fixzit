"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/contexts/TranslationContext";
import { logger } from "@/lib/logger";

interface BalanceSheetResponse {
  asOf: string;
  assets: number;
  liabilities: number;
  equity: number;
  equationOk: boolean;
}

export default function BalanceSheetWidget({
  initialDate = new Date().toISOString().slice(0, 10),
}: {
  initialDate?: string;
}) {
  const { t } = useTranslation();
  const [asOf, setAsOf] = useState(initialDate);
  const [data, setData] = useState<BalanceSheetResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/finance/reports/balance-sheet?asOf=${asOf}`,
      );
      if (res.status === 403) {
        setError(
          t(
            "finance.balance.forbidden",
            "You do not have access to balance sheets.",
          ),
        );
        setData(null);
        return;
      }
      if (!res.ok) {
        throw new Error(
          t("finance.balance.error", "Failed to load balance sheet"),
        );
      }
      const body = await res.json();
      setData(body);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.warn("Balance sheet fetch failed", {
        error: error.message,
        stack: error.stack,
      });
      setError(
        error.message ||
          t("finance.balance.error", "Failed to load balance sheet"),
      );
    } finally {
      setLoading(false);
    }
  }, [asOf, t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{t("finance.balance.title", "Balance Sheet")}</span>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="h-8"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={load}
              disabled={loading}
              aria-label={t("finance.balance.refresh", "Refresh balance sheet")}
              title={t("finance.balance.refresh", "Refresh balance sheet")}
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
              {t("finance.balance.asOf", "As of")}:{" "}
              {new Date(data.asOf).toLocaleDateString()}
            </p>
            <p className="font-semibold">
              {t("finance.balance.assets", "Assets")}: {data.assets.toFixed(2)}
            </p>
            <p>
              {t("finance.balance.liabilities", "Liabilities")}:{" "}
              {data.liabilities.toFixed(2)}
            </p>
            <p>
              {t("finance.balance.equity", "Equity")}: {data.equity.toFixed(2)}
            </p>
            <p
              className={data.equationOk ? "text-success" : "text-destructive"}
            >
              {data.equationOk
                ? t("finance.balance.ok", "Assets = Liabilities + Equity")
                : t("finance.balance.notOk", "Equation mismatch detected")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
