'use client';
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, ShoppingCart } from "lucide-react";
import { AuctionWinner } from "@/services/souq/ads/auction-engine";
import { logger } from "@/lib/logger";

interface SponsoredProductProps {
  winner: AuctionWinner;
  context: {
    query?: string;
    category?: string;
    productId?: string;
  };
  onImpression?: (_bid: string, _campaign: string) => void;
  onClick?: (_bid: string, _campaign: string, _actualCpc: number) => void;
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
  brand: winner.product?.brand,
  inStock: winner.product?.inStock,
});

export function SponsoredProduct({
  winner,
  context,
  onImpression,
  onClick,
}: SponsoredProductProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [impressionTracked, setImpressionTracked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const product = buildProductData(winner);

  // Track impression when ad enters viewport
  useEffect(() => {
    if (impressionTracked) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !impressionTracked) {
            trackImpression();
          }
        });
      },
      {
        threshold: 0.5, // 50% of ad must be visible
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
  }, [impressionTracked]);

  const trackImpression = async () => {
    setImpressionTracked(true);

    try {
      const bidId = getBidId(winner);
      const campaignId = getCampaignId(winner);
      onImpression?.(bidId, campaignId);

      // Track server-side
      await fetch("/api/souq/ads/impressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidId,
          campaignId,
          query: context.query,
          category: context.category,
          productId: context.productId,
        }),
      });
    } catch (error) {
      logger.error("[SponsoredProduct] Failed to track impression", error);
    }
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Call custom callback if provided
      const bidId = getBidId(winner);
      const campaignId = getCampaignId(winner);
      onClick?.(bidId, campaignId, winner.actualCpc);

      // Track click server-side
      const response = await fetch("/api/souq/ads/clicks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidId,
          campaignId,
          actualCpc: winner.actualCpc,
          query: context.query,
          category: context.category,
          productId: context.productId,
        }),
      });

      if (!response.ok) {
        logger.error("[SponsoredProduct] Click tracking failed", {
          statusText: response.statusText,
        });
      }

      // Navigate to product page
      window.location.href = `/souq/products/${winner.productId}`;
    } catch (error) {
      logger.error("[SponsoredProduct] Failed to track click", error);
      // Still navigate even if tracking fails
      window.location.href = `/souq/products/${winner.productId}`;
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-200"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-white rounded-lg border border-gray-200 hover:border-primary/30 hover:shadow-lg transition-all duration-200 overflow-hidden group"
    >
      {/* Sponsored Badge */}
      <div className="absolute top-2 end-2 z-10">
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
          Sponsored
        </span>
      </div>

      <Link href={`/souq/products/${winner.productId}`} onClick={handleClick}>
        <div className="cursor-pointer">
          {/* Product Image */}
          <div className="relative aspect-square bg-gray-50">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingCart className="w-16 h-16 text-gray-300" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="p-4 space-y-2">
            {/* Title */}
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2 min-h-[40px]">
              {product.title}
            </h3>

            {/* Brand */}
            {product.brand && (
              <p className="text-xs text-gray-500">{product.brand}</p>
            )}

            {/* Rating */}
            {product.rating && product.totalReviews ? (
              <div className="flex items-center gap-2">
                {renderStars(product.rating)}
                <span className="text-xs text-gray-600">
                  ({product.totalReviews.toLocaleString()})
                </span>
              </div>
            ) : null}

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900">
                {product.price.toFixed(2)} SAR
              </span>
              {product.originalPrice &&
                product.originalPrice > product.price && (
                  <span className="text-sm text-gray-500 line-through">
                    {product.originalPrice.toFixed(2)} SAR
                  </span>
                )}
            </div>

            {/* Badges */}
            {product.badges && product.badges.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.badges.map((badge: string) => (
                  <span
                    key={badge}
                    className="px-2 py-0.5 text-xs font-medium bg-primary/5 text-primary-dark rounded"
                  >
                    {badge === "fbf" ? "Fulfilled by Fixzit" : badge}
                  </span>
                ))}
              </div>
            )}

            {/* Stock Status */}
            {!product.inStock && (
              <div className="text-xs font-medium text-destructive">
                Out of Stock
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}
