"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/contexts/TranslationContext";
import { logger } from "@/lib/logger";

interface OwnerStatementResponse {
  propertyId: string;
  from: string;
  to: string;
  opening: number;
  charges: number;
  receipts: number;
  ending: number;
  lines: Array<{
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
  }>;
}

export default function OwnerStatementWidget() {
  const { t } = useTranslation();
  const [propertyId, setPropertyId] = useState("");
  const [from, setFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10),
  );
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<OwnerStatementResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLoad = propertyId.trim().length > 0;

  const load = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ propertyId, from, to }).toString();
      const res = await fetch(`/api/finance/reports/owner-statement?${query}`);
      if (!res.ok) {
        throw new Error(
          t("finance.owner.error", "Failed to load owner statement"),
        );
      }
      const body = await res.json();
      setData(body);
    } catch (err) {
      logger.error("Owner statement fetch failed", err as Error);
      setError(
        err instanceof Error
          ? err.message
          : t("finance.owner.error", "Failed to load owner statement"),
      );
    } finally {
      setLoading(false);
    }
  }, [propertyId, from, to, canLoad, t]);

  useEffect(() => {
    if (canLoad) {
      load();
    }
  }, [load, canLoad]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col gap-2 text-base">
          <span>{t("finance.owner.title", "Owner Statement")}</span>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Input
              placeholder={t("finance.owner.propertyId", "Property ID")}
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            />
            <div className="flex gap-2">
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={!canLoad || loading}
            onClick={load}
          >
            {t("common.refresh", "Refresh")}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {!canLoad && (
          <p>
            {t(
              "finance.owner.prompt",
              "Enter a property ID to load the statement",
            )}
          </p>
        )}
        {loading && <p>{t("common.loading", "Loading...")}</p>}
        {error && <p className="text-destructive">{error}</p>}
        {data && !loading && !error && (
          <div className="space-y-1">
            <p>
              {t("finance.owner.period", "Period")}:{" "}
              {new Date(data.from).toLocaleDateString()} →{" "}
              {new Date(data.to).toLocaleDateString()}
            </p>
            <p>
              {t("finance.owner.opening", "Opening Balance")}:{" "}
              {data.opening.toFixed(2)}
            </p>
            <p>
              {t("finance.owner.charges", "Charges")}: {data.charges.toFixed(2)}
            </p>
            <p>
              {t("finance.owner.receipts", "Receipts")}:{" "}
              {data.receipts.toFixed(2)}
            </p>
            <p className="font-semibold">
              {t("finance.owner.ending", "Ending Balance")}:{" "}
              {data.ending.toFixed(2)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
