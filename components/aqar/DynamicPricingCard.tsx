'use client';

import { useEffect, useState } from 'react';

interface DynamicPricingCardProps {
  cityId?: string;
  neighborhoodId?: string;
  propertyType?: string;
  intent?: 'BUY' | 'RENT' | 'DAILY' | string;
  currentPrice?: number;
}

export default function DynamicPricingCard({
  cityId,
  neighborhoodId,
  propertyType,
  intent = 'BUY',
  currentPrice,
}: DynamicPricingCardProps) {
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!cityId) return;
    let aborted = false;
    (async () => {
      const params = new URLSearchParams({ cityId, intent: intent as string });
      if (neighborhoodId) params.set('neighborhoodId', neighborhoodId);
      if (propertyType) params.set('propertyType', propertyType);
      try {
        const res = await fetch(`/api/aqar/pricing?${params.toString()}`);
        if (!res.ok) throw new Error('pricing failed');
        const json = await res.json();
        if (!aborted) {
          setSummary(json?.insight?.asSummary || null);
        }
      } catch {
        if (!aborted) setSummary(null);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [cityId, neighborhoodId, propertyType, intent]);

  if (!summary || !currentPrice) {
    return null;
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
      <div className="font-semibold mb-1">مؤشرات السعر في الحي</div>
      <p>{summary}</p>
      <p className="mt-2 text-xs text-slate-500">
        السعر الحالي للقائمة: {currentPrice.toLocaleString()} ﷼ — مقارنة بالمعدل المقترح أعلاه.
      </p>
      <p className="mt-1 text-[11px] text-slate-500">
        هذه المؤشرات مستندة إلى إعلانات Fixzit Aqar Souq النشطة ويمكن أن تختلف عن تقييم البنوك أو الخبراء.
      </p>
    </div>
  );
}
