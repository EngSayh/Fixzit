"use client";

import { useState } from "react";
import { Check, ArrowRight, Send, Phone, Mail, Building2 } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type TrialFormState = {
  name: string;
  email: string;
  company: string;
  phone: string;
  plan: string;
  message: string;
};

const plans = [
  {
    id: "standard",
    name: "Standard",
    price: "SR 0 / trial",
    description: "Core FM, Work Orders, Properties",
    features: ["Work Orders", "Properties & Units", "Basic Reports", "Email support"],
    cta: "Start free trial",
  },
  {
    id: "premium",
    name: "Premium",
    price: "SR 899 / month",
    description: "Finance + HR + Approvals + Analytics",
    features: [
      "All Standard features",
      "Finance & Invoicing",
      "HR & Technicians",
      "Approvals & Audit trail",
      "Priority support",
    ],
    highlight: true,
    cta: "Book a demo",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Talk to us",
    description: "SSO, Advanced compliance, Custom SLAs",
    features: [
      "All Premium features",
      "SSO & SCIM",
      "Dedicated onboarding",
      "Custom SLAs & training",
    ],
    cta: "Talk to sales",
  },
];

export default function PricingPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState<TrialFormState>({
    name: "",
    email: "",
    company: "",
    phone: "",
    plan: "standard",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/trial-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit request");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Submission failed");
    }
  };

  const update = (key: keyof TrialFormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <div className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {t("pricing.tagline", "Plans & Trials")}
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold">
            {t("pricing.title", "Choose the right Fixzit plan for your team")}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t(
              "pricing.subtitle",
              "Start with a free trial, then upgrade when you're ready. All plans include secure onboarding and bilingual support.",
            )}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 shadow-sm bg-card ${
                plan.highlight ? "border-primary shadow-primary/10" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
                {plan.highlight && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
                    {t("pricing.popular", "Popular")}
                  </span>
                )}
              </div>
              <div className="text-2xl font-semibold mb-4">{plan.price}</div>
              <ul className="space-y-2 mb-6 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full flex items-center justify-center gap-2"
                variant={plan.highlight ? "default" : "outline"}
                onClick={() => update("plan", plan.id)}
              >
                {plan.cta}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2 items-start">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-2">
              {t("pricing.trial.title", "Request a free trial or demo")}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {t(
                "pricing.trial.subtitle",
                "Tell us a bit about your organization and we will activate your Fixzit workspace.",
              )}
            </p>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    {t("pricing.trial.name", "Full name")}
                  </label>
                  <Input
                    required
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Sara Al-Mutairi"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t("pricing.trial.email", "Work email")}
                  </label>
                  <Input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {t("pricing.trial.company", "Company")}
                  </label>
                  <Input
                    required
                    value={form.company}
                    onChange={(e) => update("company", e.target.value)}
                    placeholder="Fixzit Holdings"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {t("pricing.trial.phone", "Phone (optional)")}
                  </label>
                  <Input
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+966 5x xxx xxxx"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("pricing.trial.plan", "Preferred plan")}
                </label>
                <Input
                  value={form.plan}
                  onChange={(e) => update("plan", e.target.value)}
                  placeholder="standard | premium | enterprise"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("pricing.trial.message", "Use case or requirements")}
                </label>
                <Textarea
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  placeholder={t(
                    "pricing.trial.messagePlaceholder",
                    "Tell us about your properties, workflows, or integrations you need.",
                  )}
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={status === "submitting"}
                  className="flex items-center gap-2"
                >
                  {status === "submitting"
                    ? t("pricing.trial.submitting", "Submitting...")
                    : t("pricing.trial.submit", "Submit request")}
                </Button>
                {status === "success" && (
                  <span className="text-sm text-success">
                    {t("pricing.trial.success", "Thank you! We will contact you shortly.")}
                  </span>
                )}
                {status === "error" && (
                  <span className="text-sm text-destructive">
                    {error ||
                      t(
                        "pricing.trial.error",
                        "Something went wrong. Please try again.",
                      )}
                  </span>
                )}
              </div>
            </form>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold">
              {t("pricing.vendor.title", "Vendors: get listed on Fixzit Souq")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(
                "pricing.vendor.subtitle",
                "Apply to join as a verified vendor. We’ll review your documents and invite you to the marketplace.",
              )}
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span>{t("pricing.vendor.benefit1", "Feature your services to FM teams")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span>{t("pricing.vendor.benefit2", "Submit quotes and manage RFQs")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span>{t("pricing.vendor.benefit3", "Track settlements and payouts")}</span>
              </div>
            </div>
            <Button asChild variant="outline">
              <a href="/vendor/apply" className="flex items-center gap-2">
                {t("pricing.vendor.apply", "Apply as vendor")}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <div className="text-xs text-muted-foreground">
              {t(
                "pricing.vendor.note",
                "Need an invite instead? Super Admins can invite vendors directly from the marketplace settings.",
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
