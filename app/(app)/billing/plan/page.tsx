"use client";

import { Check, ArrowRight } from "@/components/ui/icons";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/TranslationContext";

const plans = [
  {
    id: "STANDARD",
    name: "Standard",
    price: "SR 0 (trial)",
    features: ["Work Orders", "Properties & Units", "Basic Reports"],
  },
  {
    id: "PREMIUM",
    name: "Premium",
    price: "SR 899 / month",
    features: [
      "Finance & Invoicing",
      "HR & Technicians",
      "Approvals & Audit trail",
      "Priority support",
    ],
    highlight: true,
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: "Talk to us",
    features: [
      "All Premium features",
      "SSO & SCIM",
      "Dedicated onboarding",
      "Custom SLAs",
    ],
  },
];

export default function PlanPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {t("billing.plan.tagline", "Subscription")}
        </p>
        <h1 className="text-2xl font-semibold">
          {t("billing.plan.title", "Choose or upgrade your plan")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "billing.plan.subtitle",
            "Select the plan that fits your organization. Upgrade to unlock premium modules.",
          )}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`border ${plan.highlight ? "border-primary shadow-primary/10" : "border-border"}`}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{plan.name}</span>
                {plan.highlight && (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {t("billing.plan.popular", "Popular")}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xl font-semibold">{plan.price}</div>
              <ul className="space-y-2 text-sm">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-3">
                <Link href="/pricing">
                  <Button variant={plan.highlight ? "default" : "outline"} className="flex items-center gap-2" aria-label={t("billing.plan.viewPricing", "View pricing plans")} title={t("billing.plan.viewPricing", "View pricing")}>
                    {t("billing.plan.viewPricing", "View pricing")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/billing/history">
                  <Button variant="ghost" className="text-primary" aria-label={t("billing.plan.manageBilling", "Manage billing")} title={t("billing.plan.manageBilling", "Billing")}>
                    {t("billing.plan.manageBilling", "Billing")}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
