"use client";

import { useState } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { CheckCircle2, DownloadCloud, Cpu } from "lucide-react";

const STEPS = [
  {
    key: "compliance",
    titleKey: "aqar.post.steps.compliance.title",
    titleFallback: "Compliance checks",
    descKey: "aqar.post.steps.compliance.desc",
    descFallback: "Nafath + FAL + foreign ownership checks",
  },
  {
    key: "immersive",
    titleKey: "aqar.post.steps.immersive.title",
    titleFallback: "Immersive assets",
    descKey: "aqar.post.steps.immersive.desc",
    descFallback: "Upload VR/AR assets and IoT manifest",
  },
  {
    key: "pricing",
    titleKey: "aqar.post.steps.pricing.title",
    titleFallback: "Pricing insights",
    descKey: "aqar.post.steps.pricing.desc",
    descFallback: "Run dynamic pricing insights & RNPL eligibility",
  },
  {
    key: "publish",
    titleKey: "aqar.post.steps.publish.title",
    titleFallback: "Publish & cache",
    descKey: "aqar.post.steps.publish.desc",
    descFallback: "Publish to Fixzit app switcher + offline caches",
  },
];

export default function PostListingPage() {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 text-primary text-xs">
          <Cpu className="w-4 h-4" />
          {t("aqar.post.badge", "Post Wizard + AI Guardrails")}
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("aqar.post.title", "أنشر عقارك مع خطوات Fixzit الذكية")}
        </h1>
        <p className="text-muted-foreground">
          {t(
            "aqar.post.subtitle",
            "نتحقق من الترخيص، نولّد جولة VR، ونربط Work Orders تلقائيًا عند تغيير الحالة إلى RENTED أو SOLD.",
          )}
        </p>
      </div>

      <ol className="space-y-3">
        {STEPS.map((step, index) => (
          <li
            key={step.key}
            className={`p-4 border rounded-2xl flex items-center justify-between ${
              index === activeStep
                ? "border-primary bg-primary/5"
                : "border-border"
            }`}
          >
            <div>
              <p className="font-semibold text-foreground">
                {t(step.titleKey, step.titleFallback)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(step.descKey, step.descFallback)}
              </p>
            </div>
            {index < activeStep ? (
              <CheckCircle2 className="w-5 h-5 text-success" />
            ) : (
              <button
                onClick={() => setActiveStep(index)}
                className="px-3 py-1 rounded-full bg-card text-sm border border-border"
              >
                {t("aqar.post.steps.cta", "ابدأ")}
              </button>
            )}
          </li>
        ))}
      </ol>

      <div className="border border-border rounded-2xl p-4 bg-muted/30 flex items-start gap-3">
        <DownloadCloud className="w-5 h-5 text-primary mt-1" />
        <div>
          <p className="font-semibold text-foreground">
            {t("aqar.post.offline.title", "حزمة Offline جاهزة بعد النشر")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t(
              "aqar.post.offline.desc",
              "نولّد تلقائيًا ملفات JSON + خرائط تستخدمها فرق المبيعات الميدانية دون اتصال.",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
