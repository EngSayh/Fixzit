"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, ShoppingCart } from "lucide-react";
import { AuctionWinner } from "@/services/souq/ads/auction-engine";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { logger } from "@/lib/logger";

interface ProductDetailAdProps {
  winners: AuctionWinner[];
  context: {
    productId: string;
    category?: string;
  };
  onImpression?: (_bidId: string, _campaignId: string) => void;
  onClick?: (_bidId: string, _campaignId: string, _actualCpc: number) => void;
}

type SponsoredProductData = NonNullable<AuctionWinner["product"]>;

const getBidId = (winner: AuctionWinner): string =>
  winner.bidId ?? winner.bid.bidId;

const getCampaignId = (winner: AuctionWinner): string =>
  winner.campaignId ?? winner.campaign.campaignId;

const buildProductData = (winner: AuctionWinner): SponsoredProductData => ({
  title: winner.product?.title ?? "Sponsored Product",
  imageUrl: winner.product?.imageUrl,
  price: winner.product?.price ?? 0,
  originalPrice: winner.product?.originalPrice,
  rating: winner.product?.rating,
  totalReviews: winner.product?.totalReviews,
  badges: winner.product?.badges ?? [],
});

export function ProductDetailAd({
  winners,
  context,
  onImpression,
  onClick,
}: ProductDetailAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [trackedImpressions, setTrackedImpressions] = useState<Set<string>>(
    new Set(),
  );
  const auto = useAutoTranslator("souq.productDetailAd");

  // Track impressions when widget enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            winners.forEach((winner) => {
              const bidId = getBidId(winner);
              if (!trackedImpressions.has(bidId)) {
                trackImpression(winner);
              }
            });
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: "0px",
      },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [winners, trackedImpressions]);

  const trackImpression = async (winner: AuctionWinner) => {
    const bidId = getBidId(winner);
    const campaignId = getCampaignId(winner);
    setTrackedImpressions((prev) => new Set(prev).add(bidId));

    try {
      onImpression?.(bidId, campaignId);

      await fetch("/api/souq/ads/impressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidId,
          campaignId,
          productId: context.productId,
          category: context.category,
        }),
      });
    } catch (error) {
      logger.error("[ProductDetailAd] Failed to track impression", error);
    }
  };

  const handleClick = async (winner: AuctionWinner, e: React.MouseEvent) => {
    e.preventDefault();

    try {
      const bidId = getBidId(winner);
      const campaignId = getCampaignId(winner);
      onClick?.(bidId, campaignId, winner.actualCpc);

      await fetch("/api/souq/ads/clicks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidId,
          campaignId,
          actualCpc: winner.actualCpc,
          productId: context.productId,
          category: context.category,
        }),
      });

      window.location.href = `/souq/products/${winner.productId}`;
    } catch (error) {
      logger.error("[ProductDetailAd] Failed to track click", error);
      window.location.href = `/souq/products/${winner.productId}`;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-200"
            }`}
          />
        ))}
      </div>
    );
  };

  if (winners.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          {auto("Sponsored products related to this item", "header.title")}
        </h3>
        <span className="text-xs text-gray-500">
          {auto("Ad", "header.badge")}
        </span>
      </div>

      {/* Ads List */}
      <div className="divide-y divide-gray-200">
        {winners.map((winner) => {
          const product = buildProductData(winner);
          const bidId = getBidId(winner);
          return (
            <Link
              key={bidId}
              href={`/souq/products/${winner.productId}`}
              onClick={(e) => handleClick(winner, e)}
              className="block p-4 hover:bg-gray-50 transition-colors duration-150"
            >
              <div className="flex gap-3">
                {/* Product Image */}
                <div className="relative w-24 h-24 flex-shrink-0 bg-gray-50 rounded-md overflow-hidden">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.title}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Title */}
                  <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                    {product.title}
                  </h4>

                  {/* Rating */}
                  {product.rating && product.totalReviews ? (
                    <div className="flex items-center gap-1">
                      {renderStars(product.rating)}
                      <span className="text-xs text-gray-600">
                        {auto("({{count}} reviews)", "rating.total").replace(
                          "{{count}}",
                          product.totalReviews.toLocaleString(),
                        )}
                      </span>
                    </div>
                  ) : null}

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold text-gray-900">
                      {product.price.toFixed(2)} {auto("SAR", "price.currency")}
                    </span>
                    {product.originalPrice &&
                      product.originalPrice > product.price && (
                        <span className="text-xs text-gray-500 line-through">
                          {product.originalPrice.toFixed(2)}{" "}
                          {auto("SAR", "price.currency")}
                        </span>
                      )}
                  </div>

                  {/* Badges */}
                  {product.badges && product.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {product.badges.slice(0, 2).map((badge: string) => (
                        <span
                          key={badge}
                          className="px-1.5 py-0.5 text-xs font-medium bg-primary/5 text-primary-dark rounded"
                        >
                          {badge === "fbf" ? auto("FBF", "badge.fbf") : badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          {auto(
            "Sponsored ads help sellers reach more customers",
            "footer.note",
          )}
        </p>
      </div>
    </div>
  );
}
