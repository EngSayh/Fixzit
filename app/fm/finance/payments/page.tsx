"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CardGridSkeleton } from "@/components/skeletons";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { useFmOrgGuard } from "@/components/fm/useFmOrgGuard";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import ClientDate from "@/components/ClientDate";

export default function PaymentsPage() {
  const auto = useAutoTranslator("fm.finance.payments");
  const { data: session } = useSession();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({
    moduleId: "finance",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedQuery(searchQuery.trim()),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const fetchPayments = useCallback(
    async ({
      signal,
      showSpinner = true,
    }: { signal?: AbortSignal; showSpinner?: boolean } = {}) => {
      if (!orgId) return;
      setError(null);
      if (showSpinner) {
        setIsLoading(true);
      }
      try {
        const params = new URLSearchParams({ orgId });
        const response = await fetch(
          `/api/finance/payments?${params.toString()}`,
          { signal },
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            payload?.error ?? auto("Unable to load payments.", "errors.fetch"),
          );
        }
        const data = await response.json();
        setPayments(Array.isArray(data?.payments) ? data.payments : []);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : auto("Unable to load payments.", "errors.fetch"),
        );
      } finally {
        if (showSpinner) {
          setIsLoading(false);
        }
      }
    },
    [auto, orgId],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchPayments({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchPayments]);

  const filteredPayments = useMemo(() => {
    if (!debouncedQuery) return payments;
    const query = debouncedQuery.toLowerCase();
    return payments.filter(
      (payment) =>
        payment.vendor.toLowerCase().includes(query) ||
        payment.reference.toLowerCase().includes(query),
    );
  }, [payments, debouncedQuery]);

  const handlePaymentStatusChange = (paymentId: string, newStatus: PaymentRecord["status"]) => {
    setPayments(prev =>
      prev.map(payment =>
        payment.id === paymentId ? { ...payment, status: newStatus } : payment
      )
    );
  };

  if (!session) {
    return <CardGridSkeleton count={4} />;
  }

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="finance" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {auto("Payment Processing", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "Process and track vendor and contractor payments",
              "header.subtitle",
            )}
          </p>
        </div>
        <RecordPaymentDialog orgId={orgId} onRecorded={() => fetchPayments()} />
      </div>

      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {auto("Support context: {{name}}", "support.activeOrg", {
            name: supportOrg.name,
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder={auto(
            "Search payments by vendor or reference...",
            "search.placeholder",
          )}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => setDebouncedQuery(searchQuery.trim())}
        >
          {auto("Search", "search.button")}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => fetchPayments()}
          >
            {auto("Retry", "errors.retry")}
          </Button>
        </div>
      )}

      {isLoading && !filteredPayments.length ? (
        <CardGridSkeleton count={3} />
      ) : (
        <div className="grid gap-4">
          {filteredPayments.map((payment) => (
            <PaymentCard 
              key={payment.id} 
              {...payment} 
              onStatusChange={handlePaymentStatusChange}
            />
          ))}
        </div>
      )}

      {!isLoading && !error && filteredPayments.length === 0 && (
        <div className="mt-6 rounded-lg border border-border p-6 text-center text-muted-foreground">
          {debouncedQuery
            ? auto("No payments match your search.", "search.empty")
            : auto("No payments recorded yet.", "empty.state")}
        </div>
      )}
    </div>
  );
}

type PaymentRecord = {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  date: string;
  method: string;
  status: "pending" | "completed" | "failed";
  vendor: string;
};

function PaymentCard({
  id,
  vendor,
  reference,
  amount,
  currency,
  date,
  method,
  status,
  onStatusChange,
}: PaymentRecord & { onStatusChange?: (id: string, newStatus: PaymentRecord["status"]) => void }) {
  const auto = useAutoTranslator("fm.finance.payments.card");
  const [isProcessing, setIsProcessing] = useState(false);

  const statusColors = {
    pending: "bg-warning/10 text-warning border-warning/30",
    completed: "bg-success/10 text-success border-success/30",
    failed: "bg-destructive/10 text-destructive border-destructive/30",
  };

  const handleMarkCompleted = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/finance/payments/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to mark payment as completed");
      }
      toast.success(auto("Payment marked as completed", "toast.completeSuccess"));
      onStatusChange?.(id, "completed");
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : auto("Failed to complete payment", "toast.completeError");
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDetails = () => {
    window.open(`/fm/finance/payments/${id}`, "_blank");
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="font-semibold text-lg">{vendor}</div>
            <div className="text-sm text-muted-foreground">{reference}</div>
            <div className="text-xs text-muted-foreground">
              {auto("Method", "method")}: {auto(method, `methods.${method}`)}
            </div>
            <div className="text-xs text-muted-foreground">
              <ClientDate date={date} format="date-only" />
            </div>
          </div>
          <div className="text-end space-y-2">
            <div className="text-xl font-bold">
              {amount.toLocaleString()} {currency}
            </div>
            <span
              className={`text-xs rounded-full px-2 py-1 border ${statusColors[status]}`}
            >
              {auto(status, `status.${status}`)}
            </span>
          </div>
        </div>
        {status === "pending" && (
          <div className="flex gap-2 mt-4">
            <Button 
              size="sm" 
              variant="default"
              onClick={handleMarkCompleted}
              disabled={isProcessing}
              aria-label={auto("Mark payment as completed", "actions.completeLabel")}
            >
              {auto("Mark Completed", "actions.complete")}
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleViewDetails}
              disabled={isProcessing}
              aria-label={auto("View payment details", "actions.viewLabel")}
            >
              {auto("View Details", "actions.view")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecordPaymentDialog({ orgId, onRecorded: _onRecorded }: { orgId: string; onRecorded?: () => void }) {
  const auto = useAutoTranslator("fm.finance.payments.create");
  const [open, setOpen] = useState(false);
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!vendor.trim() || !amount) {
      setSubmitError(
        auto("Vendor and amount are mandatory.", "toast.validation"),
      );
      return;
    }
    setSubmitError(null);
    const toastId = toast.loading(
      auto("Recording payment...", "toast.loading"),
    );
    setSubmitting(true);
    try {
      const payload = {
        orgId,
        vendor: vendor.trim(),
        amount: Number(amount),
        method,
        reference: reference.trim(),
      };
      const response = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body?.error ?? auto("Failed to record payment", "toast.error"),
        );
      }
      toast.success(auto("Payment recorded successfully", "toast.success"), {
        id: toastId,
      });
      setOpen(false);
      setVendor("");
      setAmount("");
      setReference("");
      _onRecorded?.();
    } catch (_error) {
      const message =
        _error instanceof Error
          ? _error.message
          : auto("Failed to record payment", "toast.error");
      setSubmitError(message);
      toast.error(message, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{auto("Record Payment", "trigger")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{auto("Record New Payment", "title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label htmlFor="payment-vendor" className="text-sm font-medium">
              {auto("Vendor", "fields.vendor")}
            </label>
            <Input
              id="payment-vendor"
              placeholder={auto(
                "e.g. ABC Supplies Co.",
                "fields.vendorPlaceholder",
              )}
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="payment-amount" className="text-sm font-medium">
              {auto("Amount (SAR)", "fields.amount")}
            </label>
            <Input
              id="payment-amount"
              type="number"
              placeholder="12500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="payment-method" className="text-sm font-medium">
              {auto("Payment Method", "fields.method")}
            </label>
            <select
              id="payment-method"
              className="w-full border border-border rounded-md p-2"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="bank_transfer">
                {auto("Bank Transfer", "methods.bank_transfer")}
              </option>
              <option value="check">{auto("Check", "methods.check")}</option>
              <option value="cash">{auto("Cash", "methods.cash")}</option>
              <option value="credit_card">
                {auto("Credit Card", "methods.credit_card")}
              </option>
            </select>
          </div>
          <div>
            <label htmlFor="payment-reference" className="text-sm font-medium">
              {auto("Reference Number", "fields.reference")}
            </label>
            <Input
              id="payment-reference"
              placeholder={auto(
                "e.g. PAY-2024-004",
                "fields.referencePlaceholder",
              )}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!vendor.trim() || !amount || isSubmitting}
            className="w-full"
          >
            {isSubmitting
              ? auto("Recording...", "submit.loading")
              : auto("Record Payment", "submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
