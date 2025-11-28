"use client";

import useSWR from "swr";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { useTranslation } from "@/contexts/TranslationContext";

type Invoice = {
  id: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed";
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
};

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => {
    if (!res.ok) throw new Error("Failed to load invoices");
    return res.json();
  });

const StatusIcon = ({ status }: { status: Invoice["status"] }) => {
  if (status === "paid") return <CheckCircle className="h-4 w-4 text-success" />;
  if (status === "pending") return <Clock className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-destructive" />;
};

export default function BillingHistoryPage() {
  const { t } = useTranslation();
  const { data, error, isLoading } = useSWR<{ invoices: Invoice[] }>(
    "/api/billing/history",
    fetcher,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {t("billing.history.tagline", "Billing")}
          </p>
          <h1 className="text-2xl font-semibold">
            {t("billing.history.title", "Billing history & invoices")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "billing.history.subtitle",
              "Review your subscription invoices and payment status. Upgrade or manage plans from the Pricing page.",
            )}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("billing.history.tableTitle", "Invoices")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="text-sm text-muted-foreground">{t("common.loading", "Loading...")}</div>}
          {error && (
            <div className="text-sm text-destructive">
              {t("billing.history.error", "Failed to load invoices")}
            </div>
          )}
          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("billing.history.invoice", "Invoice")}</TableHead>
                  <TableHead>{t("billing.history.amount", "Amount")}</TableHead>
                  <TableHead>{t("billing.history.status", "Status")}</TableHead>
                  <TableHead>{t("billing.history.period", "Period")}</TableHead>
                  <TableHead>{t("billing.history.paidAt", "Paid at")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.invoices ?? []).map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.id}</TableCell>
                    <TableCell>
                      {inv.amount} {inv.currency}
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <StatusIcon status={inv.status} />
                      <span className="capitalize">{inv.status}</span>
                    </TableCell>
                    <TableCell>
                      {new Date(inv.periodStart).toLocaleDateString()} -{" "}
                      {new Date(inv.periodEnd).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {inv.paidAt
                        ? new Date(inv.paidAt).toLocaleString()
                        : t("billing.history.unpaid", "Unpaid")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
