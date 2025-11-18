'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface RecommendationItem {
  _id: string;
  title?: string;
  city?: string;
  neighborhood?: string;
  price?: { amount?: number; currency?: string };
  propertyType?: string;
  intent?: string;
  rnplEligible?: boolean;
  ai?: { recommendationScore?: number };
  pricing?: { currentBand?: string; suggestedPrice?: number };
  pricingInsights?: { pricePerSqm?: number };
  iotFeatures?: { key?: string; label?: string }[];
}

interface RecommendationRailProps {
  listingId?: string;
  city?: string;
  intent?: string;
  propertyType?: string;
}

export function RecommendationRail({ listingId, city, intent, propertyType }: RecommendationRailProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (listingId) params.set('listingId', listingId);
        if (!listingId && city) params.set('city', city);
        if (!listingId && intent) params.set('intent', intent);
        if (propertyType) params.set('propertyType', propertyType);
        params.set('limit', '6');
        const res = await fetch(`/api/aqar/recommendations?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load recommendations');
        const data = await res.json();
        if (!cancelled) {
          setItems(Array.isArray(data?.items) ? data.items : []);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId, city, intent, propertyType]);

  if (loading && items.length === 0) {
    return (
      <div className="border border-border rounded-2xl p-4 text-sm text-muted-foreground">
        {t('aqar.recommendations.loading', 'جارٍ تحميل التوصيات الذكية...')}
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {t('aqar.recommendations.title', 'اقتراحات Fixzit الذكية')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('aqar.recommendations.subtitle', 'يعتمد على الذكاء الاصطناعي، المشاهدات، وبيانات السوق الحية')}
          </p>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((item) => {
          const score = item.ai?.recommendationScore ?? 0;
          const price = item.price?.amount ? `${item.price.amount.toLocaleString()} ﷼` : '—';
          const pricePerSqm = item.pricingInsights?.pricePerSqm
            ? `${item.pricingInsights.pricePerSqm.toLocaleString()} ﷼/م²`
            : null;
          const smartCount = item.iotFeatures?.length ?? 0;
          const smartLabel = t('aqar.recommendations.smart', `مزايا ذكية (${smartCount})`);
          return (
            <article
              key={item._id}
              className="min-w-[240px] bg-card border border-border rounded-2xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground line-clamp-2">
                  {item.title || t('aqar.recommendations.untitled', 'عقار بدون عنوان')}
                </span>
                <span className="text-xs text-muted-foreground">{score.toFixed(0)}%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {item.city}
                {item.neighborhood ? ` • ${item.neighborhood}` : ''}
              </p>
              <p className="text-lg font-bold text-foreground">{price}</p>
              <div className="flex flex-wrap gap-1 text-[10px]">
                {item.pricing?.currentBand && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {item.pricing.currentBand}
                  </span>
                )}
                {item.rnplEligible && (
                  <span className="px-2 py-0.5 rounded-full bg-success/10 text-success">
                    {t('aqar.recommendations.rnpl', 'جاهز للتمويل')}
                  </span>
                )}
                {smartCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                    {smartLabel}
                  </span>
                )}
              </div>
              <ul className="text-xs text-muted-foreground list-disc ps-4">
                {pricePerSqm && <li>{pricePerSqm}</li>}
                {item.pricing?.suggestedPrice && (
                  <li>
                    {t('aqar.recommendations.suggested', 'سعر مقترح')} {' '}
                    {item.pricing.suggestedPrice.toLocaleString()} ﷼
                  </li>
                )}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default RecommendationRail;
