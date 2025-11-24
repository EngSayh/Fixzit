"use client";

import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useFmOrgGuard } from "@/components/fm/useFmOrgGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { PhoneOutgoing, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type LeadFormState = {
  contact: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
};

type LeadAction = "logCall" | "pipeline";

export default function CreateLeadPage() {
  const { hasOrgContext, guard, supportBanner, orgId } = useFmOrgGuard({
    moduleId: "crm",
  });
  const auto = useAutoTranslator("fm.crm.leads.new");
  const [form, setForm] = useState<LeadFormState>({
    contact: "",
    company: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof LeadFormState, string>>
  >({});
  const [actionError, setActionError] = useState<string | null>(null);

  const updateField =
    (field: keyof LeadFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const validate = () => {
    const validationErrors: Partial<Record<keyof LeadFormState, string>> = {};
    if (!form.contact.trim()) {
      validationErrors.contact = auto(
        "Contact is required.",
        "form.validation.contact",
      );
    }
    if (!form.company.trim()) {
      validationErrors.company = auto(
        "Company is required.",
        "form.validation.company",
      );
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      validationErrors.email = auto(
        "Provide a valid email address.",
        "form.validation.email",
      );
    }
    if (form.phone && form.phone.replace(/\D/g, "").length < 10) {
      validationErrors.phone = auto(
        "Phone number seems too short.",
        "form.validation.phone",
      );
    }
    return validationErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nativeEvent = event.nativeEvent as SubmitEvent;
    const submitter = nativeEvent.submitter as HTMLButtonElement | null;
    const action = (submitter?.dataset.action as LeadAction) ?? "pipeline";

    setActionError(null);
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setActionError(
        auto("Fix validation errors and try again.", "form.validation"),
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        contact: form.contact.trim(),
        company: form.company.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        notes: form.notes.trim(),
      };

      const endpoint =
        action === "logCall" ? "/api/crm/leads/log-call" : "/api/crm/contacts";

      const body =
        action === "logCall"
          ? { ...payload, action: "log_call" }
          : { type: "LEAD", ...payload };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId && { "x-tenant-id": orgId }),
        } as HeadersInit,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.error ??
            auto("Unable to process the request.", "actions.error"),
        );
      }

      if (action === "logCall") {
        toast.success(
          auto("Call logged to the activity timeline.", "actions.call.success"),
        );
      } else {
        toast.success(auto("Lead added to pipeline.", "actions.success"));
        setForm({ contact: "", company: "", email: "", phone: "", notes: "" });
      }
      setErrors({});
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : auto("Request failed", "actions.error");
      setActionError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="crm" />
      {supportBanner}

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {auto("Sales pipeline", "header.kicker")}
        </p>
        <h1 className="text-3xl font-semibold">
          {auto("Capture a new lead", "header.title")}
        </h1>
        <p className="text-muted-foreground">
          {auto(
            "Perfect for SDRs and partner teams working on FM opportunities.",
            "header.subtitle",
          )}
        </p>
      </header>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{auto("Lead basics", "form.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact">
                  {auto("Contact name", "form.contact")}
                </Label>
                <Input
                  id="contact"
                  placeholder="Sara Alharbi"
                  value={form.contact}
                  onChange={updateField("contact")}
                  aria-invalid={Boolean(errors.contact)}
                  aria-describedby={
                    errors.contact ? "contact-error" : undefined
                  }
                />
                {errors.contact && (
                  <p id="contact-error" className="text-sm text-destructive">
                    {errors.contact}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">
                  {auto("Company", "form.company")}
                </Label>
                <Input
                  id="company"
                  placeholder="Aqar Souq"
                  value={form.company}
                  onChange={updateField("company")}
                  aria-invalid={Boolean(errors.company)}
                  aria-describedby={
                    errors.company ? "company-error" : undefined
                  }
                />
                {errors.company && (
                  <p id="company-error" className="text-sm text-destructive">
                    {errors.company}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{auto("Email", "form.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="sara@company.com"
                  value={form.email}
                  onChange={updateField("email")}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="text-sm text-destructive">
                    {errors.email}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{auto("Phone", "form.phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+966 5X XXX XXXX"
                  value={form.phone}
                  onChange={updateField("phone")}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                />
                {errors.phone && (
                  <p id="phone-error" className="text-sm text-destructive">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">
                {auto("Interest / notes", "form.notes")}
              </Label>
              <Textarea
                id="notes"
                rows={4}
                placeholder={auto(
                  "Mention products, timing, blockers…",
                  "form.notes.placeholder",
                )}
                value={form.notes}
                onChange={updateField("notes")}
              />
            </div>
            {actionError && (
              <p className="text-sm text-destructive">{actionError}</p>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex gap-3">
          <Button
            variant="outline"
            type="submit"
            data-action="logCall"
            aria-label={auto("Log call for this lead", "actions.call.aria")}
            disabled={submitting}
          >
            <PhoneOutgoing className="me-2 h-4 w-4" />
            {submitting
              ? auto("Working...", "actions.call.loading")
              : auto("Log a call", "actions.call")}
          </Button>
          <Button
            type="submit"
            data-action="pipeline"
            aria-label={auto("Add lead to pipeline", "actions.add.aria")}
            disabled={submitting}
          >
            <Send className="me-2 h-4 w-4" />
            {submitting
              ? auto("Submitting...", "actions.submitting")
              : auto("Add to pipeline", "actions.add")}
          </Button>
        </div>
      </form>
    </div>
  );
}
