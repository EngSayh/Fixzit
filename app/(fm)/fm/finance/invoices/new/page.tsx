"use client";

import type { ReactNode } from "react";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { CardGridSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import {
  CalendarRange,
  FileSpreadsheet,
  Inbox,
  Send,
  ShieldCheck,
} from "@/components/ui/icons";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { FmGuardedPage } from "@/components/fm/FmGuardedPage";

const checklist = [
  {
    title: "Validate customer master data",
    detail: "VAT info + billing contacts",
  },
  { title: "Attach PO & scope documents", detail: "Upload supporting files" },
  {
    title: "Confirm installment schedule",
    detail: "Align with finance forecast",
  },
];

const timeline = [
  { title: "Draft shared with customer", due: "Mar 4", status: "pending" },
  { title: "Finance approval window", due: "Mar 5", status: "pending" },
  { title: "Send via portal / email", due: "Mar 6", status: "pending" },
];

export default function FinanceInvoiceCreatePage() {
  return (
    <FmGuardedPage moduleId="finance">
      {({ orgId, supportBanner }) => (
        <FinanceInvoiceCreateContent
          orgId={orgId}
          supportBanner={supportBanner}
        />
      )}
    </FmGuardedPage>
  );
}

type FinanceInvoiceCreateContentProps = {
  orgId: string;
  supportBanner?: ReactNode | null;
};

function FinanceInvoiceCreateContent({
  orgId,
  supportBanner,
}: FinanceInvoiceCreateContentProps) {
  const auto = useAutoTranslator("fm.finance.invoices.new");
  const { data: session } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customer: "",
    amount: "",
    dueDate: "",
    description: "",
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.customer || !formData.amount || !formData.dueDate) {
      toast.error(auto("Please fill in required fields.", "form.validation"));
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          amount: Number(formData.amount),
          currency: "SAR",
          description:
            formData.description || `Invoice for ${formData.customer}`,
          dueDate: formData.dueDate,
          items: [
            {
              description: formData.description || "Services",
              quantity: 1,
              price: Number(formData.amount),
            },
          ],
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to create invoice");
      }
      toast.success(auto("Invoice submitted for approval.", "actions.success"));
      setFormData({ customer: "", amount: "", dueDate: "", description: "" });
    } catch (_error) {
      toast.error(_error instanceof Error ? _error.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="space-y-6">
        <ModuleViewTabs moduleId="finance" />
        <CardGridSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="finance" />
      {supportBanner}

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {auto("Invoice generation", "header.kicker")}
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            {auto("Finance-first invoice wizard", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "Creates invoices with forecasting context, compliance checks, and PO reconciliation.",
              "header.subtitle",
            )}
          </p>
        </div>
      </header>
      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{auto("Invoice details", "form.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Include internal controls so finance + ops can approve quickly.",
                "form.subtitle",
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer">
                  {auto("Customer", "form.customer")}
                </Label>
                <Input
                  id="customer"
                  placeholder={auto(
                    "Aqar Souq Operations LLC",
                    "form.customer.placeholder",
                  )}
                  value={formData.customer}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      customer: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="po">
                  {auto("PO / Contract reference", "form.po")}
                </Label>
                <Input id="po" placeholder="#PO-2044" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">
                  {auto("Amount (SAR)", "form.amount")}
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="145000"
                  value={formData.amount}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      amount: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due">{auto("Due date", "form.due")}</Label>
                <Input
                  id="due"
                  type="date"
                  value={formData.dueDate}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      dueDate: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">
                {auto("Scope / description", "form.description")}
              </Label>
              <Textarea
                id="description"
                rows={4}
                placeholder={auto(
                  "Breakdown of services…",
                  "form.description.placeholder",
                )}
                value={formData.description}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <Button type="button" variant="outline" aria-label={auto("Attach supporting docs", "form.attachAria")}>
              <Inbox className="me-2 h-4 w-4" />
              {auto("Attach supporting docs", "form.attach")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {auto("Finance checklist", "checklist.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Pre-flight controls before releasing invoices.",
                "checklist.subtitle",
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {checklist.map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-border/60 p-3"
              >
                <p className="font-medium">
                  {auto(item.title, `checklist.${item.title}`)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {auto(item.detail, `checklist.${item.title}.detail`)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="lg:col-span-3 flex justify-end gap-3">
          <Button type="button" variant="outline" aria-label={auto("Import from spreadsheet", "actions.importAria")}>
            <FileSpreadsheet className="me-2 h-4 w-4" />
            {auto("Import from spreadsheet", "actions.import")}
          </Button>
          <Button type="submit" disabled={submitting} aria-label={auto("Submit for approval", "actions.submitAria")}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
                {auto("Submitting...", "actions.submitting")}
              </span>
            ) : (
              <>
                <Send className="me-2 h-4 w-4" />
                {auto("Submit for approval", "actions.submit")}
              </>
            )}
          </Button>
        </div>
      </form>

      <Card className="border-dashed border-border/70">
        <CardHeader>
          <CardTitle>{auto("Approval timeline", "timeline.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto(
              "Track dependencies before the invoice is delivered.",
              "timeline.subtitle",
            )}
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {timeline.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border/80 p-4"
            >
              <p className="text-xs uppercase text-muted-foreground">
                {item.status}
              </p>
              <p className="text-lg font-semibold">
                {auto(item.title, `timeline.${item.title}`)}
              </p>
              <p className="text-sm text-muted-foreground">
                <CalendarRange className="me-2 inline h-4 w-4" />
                {item.due}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {auto("Compliance & audit trail", "compliance.title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto(
              "Outputs feed /api/finance/invoices/new and ERP integrations.",
              "compliance.subtitle",
            )}
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {auto("ZATCA e-invoicing ready", "compliance.zatca")}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
            {auto(
              "Supports milestone billing & installment schedules",
              "compliance.milestones",
            )}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
