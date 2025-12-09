"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { logger } from "@/lib/logger";

interface Product {
  fsin: string;
  title: string;
  imageUrl?: string;
  price: number;
  rating?: number;
  totalReviews?: number;
}

interface SponsoredBrandBannerProps {
  campaignId: string;
  bidId: string;
  brandName: string;
  brandLogo?: string;
  headline: string;
  products: Product[];
  actualCpc: number;
  context: {
    query?: string;
    category?: string;
  };
  onImpression?: (_bidId: string, _campaignId: string) => void;
  onClick?: (
    _bidId: string,
    _campaignId: string,
    _productId: string,
    _actualCpc: number,
  ) => void;
}

export function SponsoredBrandBanner({
  campaignId,
  bidId,
  brandName,
  brandLogo,
  headline,
  products,
  actualCpc,
  context,
  onImpression,
  onClick,
}: SponsoredBrandBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [impressionTracked, setImpressionTracked] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Track impression when banner enters viewport
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
        threshold: 0.3, // 30% of banner must be visible
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

  // Update scroll button states
  useEffect(() => {
    const updateScrollButtons = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", updateScrollButtons);
      updateScrollButtons();
    }

    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener("scroll", updateScrollButtons);
      }
    };
  }, []);

  const trackImpression = async () => {
    setImpressionTracked(true);

    try {
      if (onImpression) {
        onImpression(bidId, campaignId);
      }

      await fetch("/api/souq/ads/impressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidId,
          campaignId,
          query: context.query,
          category: context.category,
        }),
      });
    } catch (error) {
      logger.error("[SponsoredBrandBanner] Failed to track impression", error);
    }
  };

  const handleProductClick = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault();

    try {
      if (onClick) {
        onClick(bidId, campaignId, productId, actualCpc);
      }

      await fetch("/api/souq/ads/clicks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidId,
          campaignId,
          actualCpc,
          query: context.query,
          category: context.category,
          productId,
        }),
      });

      window.location.href = `/souq/products/${productId}`;
    } catch (error) {
      logger.error("[SponsoredBrandBanner] Failed to track click", error);
      window.location.href = `/souq/products/${productId}`;
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg overflow-hidden mb-6"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Brand Logo */}
            {brandLogo && (
              <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-white border border-gray-200">
                <Image
                  src={brandLogo}
                  alt={brandName}
                  fill
                  className="object-contain p-2"
                />
              </div>
            )}

            {/* Brand Info */}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{brandName}</h2>
              <p className="text-sm text-gray-600 mt-1">{headline}</p>
            </div>
          </div>

          {/* Sponsored Badge */}
          <span className="px-3 py-1 text-xs font-medium bg-white text-gray-600 rounded-full border border-gray-300">
            Sponsored
          </span>
        </div>

        {/* Product Carousel */}
        <div className="relative">
          {/* Scroll Left Button */}
          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              className="absolute start-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
          )}

          {/* Products Container */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {products.map((product) => (
              <Link
                key={product.fsin}
                href={`/souq/products/${product.fsin}`}
                onClick={(e) => handleProductClick(product.fsin, e)}
                className="flex-shrink-0 w-48 bg-white rounded-lg border border-gray-200 hover:border-primary/30 hover:shadow-lg transition-all duration-200 overflow-hidden group"
              >
                {/* Product Image */}
                <div className="relative aspect-square bg-gray-50">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                      sizes="192px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3 space-y-2">
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 min-h-[40px]">
                    {product.title}
                  </h3>

                  <div className="text-lg font-bold text-gray-900">
                    {product.price.toFixed(2)} SAR
                  </div>

                  {product.rating && product.totalReviews && (
                    <div className="text-xs text-gray-600">
                      ⭐ {product.rating.toFixed(1)} ({product.totalReviews})
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Scroll Right Button */}
          {canScrollRight && (
            <button
              onClick={() => scroll("right")}
              className="absolute end-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-6 h-6 text-gray-700" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
