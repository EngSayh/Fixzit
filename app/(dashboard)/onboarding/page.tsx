"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import OnboardingWizard, { type OnboardingRole } from "@/components/onboarding/OnboardingWizard";
import { useTranslation } from "@/contexts/TranslationContext";
import { Loader2 } from "@/components/ui/icons";

function OnboardingContent() {
  const searchParams = useSearchParams();
  const { t, isRTL } = useTranslation();

  const role = searchParams?.get("role") as OnboardingRole | null;
  const caseId = searchParams?.get("caseId");
  const step = searchParams?.get("step");

  return (
    <div className="container max-w-4xl py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {t("onboarding.welcome", isRTL ? "مرحباً بك في فيكزت" : "Welcome to Fixzit")}
        </h1>
        <p className="text-muted-foreground">
          {t(
            "onboarding.subtitle",
            isRTL
              ? "أكمل عملية التسجيل للبدء في استخدام المنصة"
              : "Complete your registration to start using the platform"
          )}
        </p>
      </div>

      <OnboardingWizard
        role={role || undefined}
        caseId={caseId || undefined}
        initialStep={step ? parseInt(step, 10) : 1}
      />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
