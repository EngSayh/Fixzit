"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslation } from "@/contexts/TranslationContext";
import {
  MapPin,
  CheckCircle,
  Bath,
  Maximize,
  Share2,
  Clock,
} from "lucide-react";
import AiInsights from "@/components/aqar/AiInsights";
import ProptechBadges from "@/components/aqar/ProptechBadges";
import RecommendationRail from "@/components/aqar/RecommendationRail";
import DynamicPricingCard from "@/components/aqar/DynamicPricingCard";
import VRTour from "@/components/aqar/VRTour";

interface ListingResponse {
  listing: {
    _id: string;
    title?: string;
    price?: { amount: number; currency: string };
    areaSqm?: number;
    city?: string;
    neighborhood?: string;
    amenities?: string[];
    media?: { url: string }[];
    analytics?: { views?: number };
    rnplEligible?: boolean;
    immersive?: { vrTour?: { url?: string } };
    proptech?: Parameters<typeof ProptechBadges>[0]["proptech"];
    iotFeatures?: { key?: string; label?: string }[];
    pricingInsights?: Parameters<typeof AiInsights>[0]["pricing"];
    ai?: { recommendationScore?: number };
    intent?: string;
    propertyType?: string;
    location?: { cityId?: string; neighborhoodId?: string };
  };
}

export default function ListingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { t } = useTranslation();
  const [listing, setListing] = useState<ListingResponse["listing"] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineInfo, setOfflineInfo] = useState<{
    cacheKey: string;
    checksum: string;
  } | null>(null);
  const [offlineLoading, setOfflineLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/aqar/listings/${params.id}`);
        if (!res.ok) throw new Error("Failed to load listing");
        const data: ListingResponse = await res.json();
        if (!cancelled) {
          setListing(data.listing);
          setError(null);
        }
      } catch (_err) {
        if (!cancelled) {
          setError(t("aqar.listing.error", "تعذر تحميل التفاصيل"));
          setListing(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, t]);

  const heroImage = useMemo(
    () => listing?.media?.[0]?.url || "/images/property-placeholder.jpg",
    [listing],
  );

  const handleGenerateOffline = async () => {
    if (!listing) return;
    setOfflineLoading(true);
    try {
      const query = new URLSearchParams();
      if (listing.city) query.set("city", listing.city);
      if (listing.intent) query.set("intent", listing.intent);
      const res = await fetch(`/api/aqar/offline?${query.toString()}`);
      if (!res.ok) throw new Error("offline failed");
      const data = await res.json();
      setOfflineInfo({ cacheKey: data.cacheKey, checksum: data.checksum });
    } catch (_err) {
      setOfflineInfo(null);
    } finally {
      setOfflineLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-muted-foreground">
        {t("aqar.listing.loading", "يتم تحميل تفاصيل العقار...")}
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-destructive">
        {error || t("aqar.listing.notFound", "لم يتم العثور على العقار")}
      </div>
    );
  }

  const amenitiesCount = listing.amenities?.length ?? 0;
  const amenityLabel = t("aqar.listing.amenities", `${amenitiesCount} ميزة`);
  const viewsCount = listing.analytics?.views ?? 0;
  const viewsLabel = t("aqar.listing.views", `${viewsCount} مشاهدة`);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="relative h-80 rounded-3xl overflow-hidden bg-muted">
          <Image
            src={heroImage}
            alt={listing.title || "Listing"}
            fill
            className="object-cover"
          />
          <button type="button" className="absolute top-4 end-4 bg-white/90 rounded-full px-4 py-1 text-sm text-foreground flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            {t("common.share", "Share")}
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {listing.intent}
            </p>
            <h1 className="text-3xl font-semibold text-foreground">
              {listing.title || t("aqar.listing.untitled", "عقار بدون عنوان")}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4" />
              {listing.neighborhood && `${listing.neighborhood} • `}
              {listing.city}
            </p>
          </div>
          <div className="text-4xl font-bold text-foreground">
            {listing.price?.amount
              ? `${listing.price.amount.toLocaleString()} ﷼`
              : "--"}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              {amenityLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <Bath className="w-4 h-4" />
              {t("aqar.listing.baths", "دورات مياه متعددة")}
            </span>
            {listing.areaSqm && (
              <span className="inline-flex items-center gap-1">
                <Maximize className="w-4 h-4" />
                {listing.areaSqm} m²
              </span>
            )}
            {listing.analytics?.views && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {viewsLabel}
              </span>
            )}
          </div>
          <button type="button"
            onClick={handleGenerateOffline}
            disabled={offlineLoading}
            className="w-full md:w-auto px-4 py-2 rounded-2xl bg-primary text-primary-foreground text-sm"
          >
            {offlineLoading
              ? t(
                  "aqar.listing.offline.loading",
                  "جاري تجهيز الحزمة غير المتصلة...",
                )
              : t("aqar.listing.offline.cta", "حزمة Offline للعرض الميداني")}
          </button>
          {offlineInfo && (
            <p className="text-xs text-muted-foreground">
              {t("aqar.listing.offline.ready", "تم توليد الحزمة")} #
              {offlineInfo.cacheKey} • {offlineInfo.checksum.slice(0, 6)}
            </p>
          )}

          <DynamicPricingCard
            cityId={listing.location?.cityId}
            neighborhoodId={listing.location?.neighborhoodId}
            propertyType={listing.propertyType}
            intent={(listing.intent as "BUY" | "RENT" | "DAILY") || "BUY"}
            currentPrice={listing.price?.amount}
          />
        </div>
      </div>

      <AiInsights
        aiScore={listing.ai?.recommendationScore}
        pricing={listing.pricingInsights}
        rnplEligible={listing.rnplEligible}
        proptech={listing.proptech}
        city={listing.city}
        neighborhood={listing.neighborhood}
      />

      {listing.immersive?.vrTour?.url && (
        <VRTour
          url={listing.immersive.vrTour.url}
          title={t("aqar.listing.vr", "جولة افتراضية")}
        />
      )}

      <ProptechBadges
        proptech={listing.proptech}
        iotFeatures={listing.iotFeatures}
      />

      <RecommendationRail
        listingId={listing._id}
        city={listing.city}
        intent={listing.intent}
        propertyType={listing.propertyType}
      />
    </div>
  );
}
