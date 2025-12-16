"use client";

import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import { useTranslation } from "@/contexts/TranslationContext";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { Banknote, CheckCircle2, Loader2, Shield, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function PayrollRunWizardPage() {
  const auto = useAutoTranslator("fm.hr.payrollRun");
  const { t } = useTranslation();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({
    moduleId: "hr",
  });
  const steps = useMemo(
    () => [
      {
        label: auto("Collect changes & allowances", "steps.collectChanges"),
        status: "done" as const,
        statusLabel: auto("Completed", "steps.status.done"),
      },
      {
        label: auto(
          "Validate compliance & accruals",
          "steps.validateCompliance",
        ),
        status: "done" as const,
        statusLabel: auto("Completed", "steps.status.done"),
      },
      {
        label: auto("Reconcile with finance forecast", "steps.reconcile"),
        status: "active" as const,
        statusLabel: auto("In progress", "steps.status.active"),
      },
      {
        label: auto("Submit payout to treasury", "steps.submitTreasury"),
        status: "pending" as const,
        statusLabel: auto("Pending", "steps.status.pending"),
      },
    ],
    [auto],
  );
  const [isSubmitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    periodStart: "",
    periodEnd: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name || !formData.periodStart || !formData.periodEnd) {
      toast.error(
        auto("Please fill in the required fields.", "actions.validation"),
      );
      return;
    }
    setSubmitting(true);
    fetch("/api/hr/payroll/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        name: formData.name,
        periodStart: formData.periodStart,
        periodEnd: formData.periodEnd,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Failed to create payroll run");
        }
        toast.success(
          auto("Payroll run created successfully.", "actions.success"),
        );
        setFormData({ name: "", periodStart: "", periodEnd: "", notes: "" });
      })
      .catch((err: Error) => toast.error(err.message))
      .finally(() => setSubmitting(false));
  };

  if (!hasOrgContext) {
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

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {auto("Payroll run wizard", "header.kicker")}
        </p>
        <h1 className="text-3xl font-semibold">
          {auto("Month-end payroll run", "header.title")}
        </h1>
        <p className="text-muted-foreground">
          {auto(
            "Complete the final reconciliation before dispatching files to treasury.",
            "header.subtitle",
          )}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{auto("Run status", "steps.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto(
              "Keep all stakeholders aligned on progress.",
              "steps.subtitle",
            )}
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.label}
              className={`rounded-xl border p-3 ${
                step.status === "active"
                  ? "border-primary bg-primary/5"
                  : step.status === "done"
                    ? "border-border bg-muted/40"
                    : "border-dashed border-border"
              }`}
            >
              <p className="text-xs uppercase text-muted-foreground">
                {step.statusLabel}
              </p>
              <p className="font-medium">{step.label}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {auto("Adjustments & attachments", "adjustments.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Attach OT sheets, incentives, or manual overrides.",
                "adjustments.subtitle",
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cycle">
                  {auto("Payroll cycle", "adjustments.cycle")}
                </Label>
                <Input
                  id="cycle"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder={auto(
                    "e.g., February 2025 · Month end",
                    "adjustments.cycle.placeholder",
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start">
                  {auto("Period start", "adjustments.start")}
                </Label>
                <Input
                  id="start"
                  type="date"
                  value={formData.periodStart}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      periodStart: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">
                  {auto("Period end", "adjustments.end")}
                </Label>
                <Input
                  id="end"
                  type="date"
                  value={formData.periodEnd}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      periodEnd: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fx">
                  {auto("FX rate (if applicable)", "adjustments.fx")}
                </Label>
                <Input id="fx" placeholder="1 SAR" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">
                {auto("Notes for finance", "adjustments.notes")}
              </Label>
              <Textarea
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                placeholder={auto(
                  "Highlight unusual movements...",
                  "adjustments.placeholder",
                )}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline">
                <Upload className="me-2 h-4 w-4" />
                {auto("Upload allowance sheet", "adjustments.upload")}
              </Button>
              <Button type="button" variant="outline">
                <Shield className="me-2 h-4 w-4" />
                {auto("Attach compliance sign-off", "adjustments.compliance")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {auto("Treasury payout summary", "payout.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Confirm totals match finance forecast before submission.",
                "payout.subtitle",
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border border-border/70 p-3 text-foreground">
              <span className="flex items-center gap-2 font-medium">
                <Banknote className="h-4 w-4 text-primary" />
                {auto("Gross payroll total", "payout.gross")}
              </span>
              <span className="font-semibold">SAR 9,643,200</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 p-3 text-foreground">
              <span className="flex items-center gap-2 font-medium">
                <Shield className="h-4 w-4 text-primary" />
                {auto("Statutory deductions", "payout.deductions")}
              </span>
              <span className="font-semibold">SAR 1,062,400</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 p-3 text-foreground">
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {auto("Net payout", "payout.net")}
              </span>
              <span className="font-semibold">SAR 8,580,800</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="outline">
            {auto("Save draft", "actions.saveDraft")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {auto("Submitting...", "actions.submitting")}
              </>
            ) : (
              <>
                <Banknote className="me-2 h-4 w-4" />
                {auto("Submit to treasury", "actions.submit")}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
