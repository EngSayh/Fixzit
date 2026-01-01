"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, Send, Phone, Mail, Building2, Users, CreditCard, Minus, Plus } from "@/components/ui/icons";
import { useTranslation } from "@/contexts/TranslationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    id: "starter",
    name: "Starter",
    pricePerUser: 0,
    description: "Free trial for small teams",
    features: ["Work Orders", "Properties & Units", "Basic Reports", "Email support"],
    maxUsers: 3,
    cta: "Start Free Trial",
    isTrial: true,
  },
  {
    id: "standard",
    name: "Standard",
    pricePerUser: 99,
    description: "Core FM, Work Orders, Properties",
    features: ["Work Orders", "Properties & Units", "Basic Reports", "Email support", "Up to 10 users"],
    maxUsers: 10,
    cta: "Subscribe Now",
  },
  {
    id: "premium",
    name: "Premium",
    pricePerUser: 199,
    description: "Finance + HR + Approvals + Analytics",
    features: [
      "All Standard features",
      "Finance & Invoicing",
      "HR & Technicians",
      "Approvals & Audit trail",
      "Priority support",
      "Up to 50 users",
    ],
    maxUsers: 50,
    highlight: true,
    cta: "Subscribe Now",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    pricePerUser: 299,
    description: "SSO, Advanced compliance, Custom SLAs",
    features: [
      "All Premium features",
      "SSO & SCIM",
      "Dedicated onboarding",
      "Custom SLAs & training",
      "Unlimited users",
    ],
    maxUsers: 999,
    cta: "Contact Sales",
    isEnterprise: true,
  },
];

export default function PricingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [userCount, setUserCount] = useState(1);
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

  const selectedPlanDetails = plans.find(p => p.id === selectedPlan);
  const totalPrice = selectedPlanDetails ? selectedPlanDetails.pricePerUser * userCount : 0;

  const handleSelectPlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (plan?.isEnterprise) {
      // For enterprise, scroll to contact form
      document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" });
      setForm(prev => ({ ...prev, plan: planId }));
    } else if (plan?.isTrial) {
      // For trial, go to signup
      router.push("/signup?plan=starter&trial=true");
    } else {
      setSelectedPlan(planId);
      setUserCount(1);
    }
  };

  const handleProceedToCheckout = () => {
    if (!selectedPlan || !selectedPlanDetails) return;
    // Navigate to checkout with plan and users - amount is calculated server-side
    // Do NOT pass amount in URL to prevent price tampering
    const params = new URLSearchParams({
      plan: selectedPlan,
      users: userCount.toString(),
      // Amount is calculated server-side from plan + users to prevent tampering
    });
    router.push(`/checkout?${params.toString()}`);
  };

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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
              <div className="text-2xl font-semibold mb-4">
                {plan.isTrial ? (
                  t("pricing.free", "Free")
                ) : plan.isEnterprise ? (
                  t("pricing.custom", "Custom pricing")
                ) : (
                  <>SR {plan.pricePerUser} <span className="text-sm font-normal text-muted-foreground">/ {t("pricing.perUser", "user / month")}</span></>
                )}
              </div>
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
                onClick={() => handleSelectPlan(plan.id)}
                aria-label={`${t("pricing.selectPlan", "Select")} ${plan.name} ${t("pricing.plan", "Plan")}`}
                title={plan.cta}
              >
                {plan.cta}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* User Selection & Checkout Panel */}
        {selectedPlan && selectedPlanDetails && !selectedPlanDetails.isTrial && !selectedPlanDetails.isEnterprise && (
          <Card className="border-primary shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t("pricing.checkout.title", "Complete Your Subscription")}
              </CardTitle>
              <CardDescription>
                {t("pricing.checkout.subtitle", "Select the number of users and proceed to payment")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h3 className="font-semibold">{selectedPlanDetails.name} {t("pricing.plan", "Plan")}</h3>
                  <p className="text-sm text-muted-foreground">SR {selectedPlanDetails.pricePerUser} / {t("pricing.perUser", "user / month")}</p>
                </div>
                <Badge variant="secondary">{t("pricing.selected", "Selected")}</Badge>
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t("pricing.checkout.users", "Number of Users")}
                </label>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setUserCount(Math.max(1, userCount - 1))}
                    disabled={userCount <= 1}
                    aria-label={t("pricing.checkout.decreaseUsers", "Decrease number of users")}
                    title={t("pricing.checkout.decreaseUsers", "Decrease users")}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={selectedPlanDetails.maxUsers}
                    value={userCount}
                    onChange={(e) => setUserCount(Math.min(selectedPlanDetails.maxUsers, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-24 text-center"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setUserCount(Math.min(selectedPlanDetails.maxUsers, userCount + 1))}
                    disabled={userCount >= selectedPlanDetails.maxUsers}
                    aria-label={t("pricing.checkout.increaseUsers", "Increase number of users")}
                    title={t("pricing.checkout.increaseUsers", "Increase users")}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {t("pricing.checkout.maxUsers", "Max")}: {selectedPlanDetails.maxUsers}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>{t("pricing.checkout.total", "Monthly Total")}:</span>
                  <span className="text-primary">SR {totalPrice.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("pricing.checkout.vatNote", "VAT (15%) will be added at checkout")}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedPlan(null)}
                  className="flex-1"
                  aria-label={t("pricing.checkout.back", "Back to Plans")}
                  title={t("pricing.checkout.back", "Back to Plans")}
                >
                  {t("pricing.checkout.back", "Back to Plans")}
                </Button>
                <Button
                  onClick={handleProceedToCheckout}
                  className="flex-1 flex items-center justify-center gap-2"
                  aria-label={t("pricing.checkout.proceed", "Proceed to Payment")}
                  title={t("pricing.checkout.proceed", "Proceed to Payment")}
                >
                  <CreditCard className="h-4 w-4" />
                  {t("pricing.checkout.proceed", "Proceed to Payment")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div id="contact-form" className="grid gap-8 lg:grid-cols-2 items-start">
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
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.plan}
                  onChange={(e) => update("plan", e.target.value)}
                >
                  <option value="standard">{t("pricing.trial.plan.standard", "Standard")}</option>
                  <option value="premium">{t("pricing.trial.plan.premium", "Premium")}</option>
                  <option value="enterprise">{t("pricing.trial.plan.enterprise", "Enterprise")}</option>
                </select>
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
                  aria-label={t("pricing.trial.submit", "Submit trial request")}
                  title={t("pricing.trial.submit", "Submit request")}
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
            <Button asChild variant="outline" aria-label={t("pricing.vendor.apply", "Apply as vendor")} title={t("pricing.vendor.apply", "Apply as vendor")}>
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
