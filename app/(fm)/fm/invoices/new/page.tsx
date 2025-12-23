"use client";

import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { ClipboardCheck, Mail, Users } from "lucide-react";
import { BaseSyntheticEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormOfflineBanner } from "@/components/common/FormOfflineBanner";

const stakeholders = [
  {
    name: "Project Ops",
    expectation: "Needs invoice draft 3 days before go-live.",
  },
  {
    name: "Customer Success",
    expectation: "Needs copy for portal + email templates.",
  },
  {
    name: "Finance AP",
    expectation: "Requires bundled invoices for enterprise accounts.",
  },
];

type InvoiceFormValues = {
  customer: string;
  project: string;
  amount: string;
  billingContact: string;
  narrative: string;
};

export default function InvoiceCreationForOpsPage() {
  const { hasOrgContext, guard, supportBanner, orgId } = useFmOrgGuard({
    moduleId: "finance",
  });
  const auto = useAutoTranslator("fm.invoices.new");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues>({
    defaultValues: {
      customer: "",
      project: "",
      amount: "",
      billingContact: "",
      narrative: "",
    },
  });
  const [activeAction, setActiveAction] = useState<"review" | "send" | null>(
    null,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = async (
    values: InvoiceFormValues,
    event?: BaseSyntheticEvent,
  ) => {
    const action = (
      (event?.nativeEvent as SubmitEvent)?.submitter as HTMLButtonElement | null
    )?.dataset?.action as "review" | "send" | undefined;
    const currentAction = action ?? "review";
    setActiveAction(currentAction);
    setSubmitError(null);
    if (!orgId) {
      const message = auto(
        "Organization context required before submitting.",
        "form.orgRequired",
      );
      setSubmitError(message);
      toast.error(message);
      return;
    }
    try {
      const amount = Number(values.amount);
      const payload = {
        customer: values.customer.trim(),
        project: values.project.trim(),
        amount,
        billingContact: values.billingContact.trim(),
        narrative: values.narrative.trim(),
        action: currentAction,
      };

      const endpoint =
        currentAction === "send"
          ? "/api/invoices/send"
          : "/api/invoices/review";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": orgId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body?.error ?? auto("Failed to process invoice.", "form.error"),
        );
      }

      toast.success(
        currentAction === "send"
          ? auto("Invoice sent to customer.", "form.sent")
          : auto("Finance review requested.", "form.requested"),
      );
      reset();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : auto("Failed to process invoice.", "form.error");
      setSubmitError(message);
      toast.error(message);
    } finally {
      setActiveAction(null);
    }
  };

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="finance" />
      {supportBanner}

      {/* P118: Offline banner for invoice creation form */}
      <FormOfflineBanner formType="invoice" />

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {auto("Field & ops workflow", "header.kicker")}
        </p>
        <h1 className="text-3xl font-semibold">
          {auto("Create customer-ready invoices", "header.title")}
        </h1>
        <p className="text-muted-foreground">
          {auto(
            "Designed for AM / ops teams who need a guided invoice flow with customer comms baked in.",
            "header.subtitle",
          )}
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{auto("Quick draft", "form.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Ops-friendly fields. Finance-only fields stay hidden unless required.",
                "form.subtitle",
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer">
                  {auto("Customer name", "form.customer")}
                </Label>
                <Input
                  id="customer"
                  placeholder={auto(
                    "e.g., Fixzit Facilities KSA",
                    "form.customer.placeholder",
                  )}
                  disabled={isSubmitting}
                  {...register("customer", {
                    required: auto(
                      "Customer name is required.",
                      "form.customer.validation",
                    ),
                  })}
                />
                {errors.customer && (
                  <p className="text-sm text-destructive">
                    {errors.customer.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">
                  {auto("Project / site", "form.project")}
                </Label>
                <Input
                  id="project"
                  placeholder="HQ Upgrades - Riyadh"
                  disabled={isSubmitting}
                  {...register("project", {
                    required: auto(
                      "Project reference is required.",
                      "form.project.validation",
                    ),
                  })}
                />
                {errors.project && (
                  <p className="text-sm text-destructive">
                    {errors.project.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">
                  {auto("Amount (SAR)", "form.amount")}
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="78000"
                  disabled={isSubmitting}
                  {...register("amount", {
                    required: auto(
                      "Amount is required.",
                      "form.amount.validation",
                    ),
                    validate: (value) =>
                      Number(value) > 0 ||
                      auto(
                        "Amount must be greater than zero.",
                        "form.amount.positive",
                      ),
                  })}
                />
                {errors.amount && (
                  <p className="text-sm text-destructive">
                    {errors.amount.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingContact">
                  {auto("Billing contact email", "form.contact")}
                </Label>
                <Input
                  id="billingContact"
                  type="email"
                  placeholder="billing@customer.com"
                  disabled={isSubmitting}
                  {...register("billingContact", {
                    required: auto(
                      "Billing contact is required.",
                      "form.contact.validation",
                    ),
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: auto(
                        "Enter a valid email address.",
                        "form.contact.email",
                      ),
                    },
                  })}
                />
                {errors.billingContact && (
                  <p className="text-sm text-destructive">
                    {errors.billingContact.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="narrative">
                {auto("Narrative for customer email", "form.narrative")}
              </Label>
              <Textarea
                id="narrative"
                rows={4}
                placeholder={auto(
                  "Hi team, here is the March invoice…",
                  "form.narrative.placeholder",
                )}
                disabled={isSubmitting}
                {...register("narrative", {
                  minLength: {
                    value: 12,
                    message: auto(
                      "Add a bit more context for the customer.",
                      "form.narrative.validation",
                    ),
                  },
                })}
              />
              {errors.narrative && (
                <p className="text-sm text-destructive">
                  {errors.narrative.message}
                </p>
              )}
            </div>
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                variant="outline"
                data-action="review"
                disabled={isSubmitting}
              >
                <ClipboardCheck className="me-2 h-4 w-4" />
                {isSubmitting && activeAction === "review"
                  ? auto("Requesting...", "form.requestReview.loading")
                  : auto("Request finance review", "form.requestReview")}
              </Button>
              <Button type="submit" data-action="send" disabled={isSubmitting}>
                <Mail className="me-2 h-4 w-4" />
                {isSubmitting && activeAction === "send"
                  ? auto("Sending...", "form.send.loading")
                  : auto("Send to customer", "form.send")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card className="border-dashed border-border/70">
        <CardHeader>
          <CardTitle>
            {auto("Stakeholder expectations", "stakeholders.title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto(
              "Keep everyone aligned when invoices leave the door.",
              "stakeholders.subtitle",
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {stakeholders.map((stakeholder) => (
            <div
              key={stakeholder.name}
              className="rounded-lg border border-border/60 p-3"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <p className="font-semibold">{stakeholder.name}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {stakeholder.expectation}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
