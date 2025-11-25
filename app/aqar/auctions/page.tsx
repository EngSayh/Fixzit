"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { Gavel, Shield } from "lucide-react";

interface AuctionListing {
  listingId: string;
  score: number;
  listing: { title?: string; city?: string; price?: number };
  highlights: string[];
}

export default function AuctionsPage() {
  const { t } = useTranslation();
  const [auctions, setAuctions] = useState<AuctionListing[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          "/api/aqar/listings/recommendations?intent=AUCTION&limit=6&experimental=false",
        );
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setAuctions(data.primary || []);
      } catch {
        setAuctions([]);
      }
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 text-warning">
          <Gavel className="w-4 h-4" />
          {t("aqar.auctions.badge", "مزادات Fixzit Souq المتقدمة")}
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("aqar.auctions.title", "مزادات مدمجة مع RNPL وREGA")}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t(
            "aqar.auctions.subtitle",
            "توقيت العد التنازلي، تأمينات، وتكامل مع Aqalat/Aflak مع إمكانية إنشاء Work Orders بعد الإغلاق.",
          )}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {auctions.map((auction) => (
          <article
            key={auction.listingId}
            className="border border-border rounded-2xl p-4 bg-card space-y-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {auction.listing.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {auction.listing.city}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                AI {auction.score.toFixed(0)}%
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {auction.listing.price
                ? `${auction.listing.price.toLocaleString()} ﷼`
                : "—"}
            </p>
            <ul className="text-xs text-muted-foreground list-disc ps-4">
              {auction.highlights.slice(0, 2).map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </article>
        ))}
        {auctions.length === 0 && (
          <div className="border border-dashed border-border rounded-2xl p-6 text-center text-muted-foreground">
            {t("aqar.auctions.empty", "لا توجد مزادات مباشرة الآن")}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border p-4 flex items-start gap-4 bg-muted/30">
        <Shield className="w-5 h-5 text-primary mt-1" />
        <div>
          <p className="font-semibold text-foreground">
            {t("aqar.auctions.rega", "تحقق REGA وZATCA جاهز")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t(
              "aqar.auctions.rega.desc",
              "نربط رخص FAL، نصدر QR زاتكا، وننشئ Work Order للتسليم بعد انتهاء المزاد.",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
