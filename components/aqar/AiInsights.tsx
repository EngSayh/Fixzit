"use client";

import { Sparkles, TrendingUp, Cpu, ShieldCheck } from "@/components/ui/icons";
import { useTranslation } from "@/contexts/TranslationContext";
import type {
  ListingPricingInsights,
  ListingProptech,
} from "@/lib/aqar/client-types";

interface AiInsightsProps {
  aiScore?: number;
  pricing?: ListingPricingInsights;
  rnplEligible?: boolean;
  proptech?: ListingProptech;
  city?: string;
  neighborhood?: string;
}

const StatCard = ({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: typeof Sparkles;
  title: string;
  value: string;
  description: string;
}) => (
  <div className="bg-card border border-border rounded-2xl p-4 flex gap-4 items-start">
    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  </div>
);

export function AiInsights({
  aiScore,
  pricing,
  rnplEligible,
  proptech,
  city,
  neighborhood,
}: AiInsightsProps) {
  const { t } = useTranslation();
  const demandScore = pricing?.demandScore ?? 0;
  const appreciation = pricing?.projectedAppreciationPct ?? 0;
  const areaLabel = city || neighborhood || "Riyadh";
  const subtitle = t(
    "aqar.aiInsights.subtitle",
    `مؤشرات فورية لحي ${areaLabel}`,
  );

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {t("aqar.aiInsights.title", "ذكاء Fixzit العقاري")}
        </p>
        <h3 className="text-2xl font-semibold text-foreground">{subtitle}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Sparkles}
          title={t("aqar.aiInsights.match", "مطابقة الذكاء الاصطناعي")}
          value={aiScore !== undefined ? `${aiScore.toFixed(0)} / 100` : "—"}
          description={t(
            "aqar.aiInsights.match.desc",
            "يعتمد على تفضيلات المستخدم، البيانات الحرارية، وتاريخ المشاهدات.",
          )}
        />
        <StatCard
          icon={TrendingUp}
          title={t("aqar.aiInsights.pricing", "التسعير الديناميكي")}
          value={
            pricing?.pricePerSqm
              ? `${pricing.pricePerSqm.toLocaleString()} ﷼/م²`
              : "—"
          }
          description={t("aqar.aiInsights.pricing.desc", "نسبة النمو المتوقعة")}
        />
        <StatCard
          icon={Cpu}
          title={t("aqar.aiInsights.demand", "مؤشر الطلب")}
          value={`${demandScore.toFixed(0)} / 100`}
          description={t(
            "aqar.aiInsights.demand.desc",
            "يحسب من المشاهدات والاستفسارات في آخر 30 يومًا.",
          )}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded-2xl p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <TrendingUp className="w-4 h-4 text-warning" />
            {t("aqar.aiInsights.appreciation", "نمو متوقع")}
          </div>
          <p className="text-3xl font-bold mt-2 text-warning">
            {appreciation ? `${appreciation.toFixed(1)}٪` : "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            {t(
              "aqar.aiInsights.appreciation.desc",
              "مبني على بيانات REGA وFixzit Souq لآخر 12 شهرًا.",
            )}
          </p>
        </div>
        <div className="border border-border rounded-2xl p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="w-4 h-4 text-success" />
            {t("aqar.aiInsights.rnpl", "تمويل RNPL & ZATCA")}
          </div>
          <p className="text-3xl font-bold mt-2 text-success">
            {rnplEligible
              ? t("aqar.aiInsights.rnpl.ready", "جاهز")
              : t("aqar.aiInsights.rnpl.custom", "حسب الطلب")}
          </p>
          <p className="text-sm text-muted-foreground">
            {rnplEligible
              ? t(
                  "aqar.aiInsights.rnpl.desc.ready",
                  "يمكن إصدار عرض تفصيلي مع QR زاتكا خلال 4 ساعات.",
                )
              : t(
                  "aqar.aiInsights.rnpl.desc.custom",
                  "يمكن ربطه يدويًا بعد مراجعة الوثائق.",
                )}
          </p>
        </div>
      </div>
      {proptech?.features && proptech.features.length > 0 && (
        <div className="border border-border rounded-2xl p-4">
          <p className="text-sm font-semibold text-foreground mb-3">
            {t("aqar.aiInsights.proptech", "خصائص PropTech وIoT")}
          </p>
          <div className="flex flex-wrap gap-2">
            {proptech.features.map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold"
              >
                <Cpu className="w-3 h-3" />
                {feature.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default AiInsights;
