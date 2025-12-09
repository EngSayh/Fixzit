"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bed, Bath, Maximize, MapPin, Heart, Eye } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { ContactActions } from "./ContactActions";
import { logger } from "@/lib/logger";

export interface PropertyCardProps {
  id: string;
  slug?: string;
  title: {
    en: string;
    ar?: string;
  };
  propertyType: string;
  listingType: "SALE" | "RENT" | "LEASE";
  location: {
    address: {
      district: string;
      city: string;
    };
  };
  features: {
    bedrooms: number;
    bathrooms: number;
    area: {
      built: number;
      unit: string;
    };
    furnished?: string;
  };
  pricing: {
    amount: number;
    currency: string;
    period?: string;
  };
  media?: Array<{
    url: string;
    isPrimary?: boolean;
  }>;
  featured?: boolean;
  verified?: boolean;
  views?: number;
  agentId?: {
    firstName?: string;
    lastName?: string;
    photo?: string;
    contact?: {
      phone?: string;
    };
  };
  rnplEligible?: boolean;
  aiScore?: number;
  proptech?: {
    smartHomeLevel?: string;
  };
  immersive?: {
    vrTour?: { ready?: boolean };
  };
}

export default function PropertyCard({
  property,
}: {
  property: PropertyCardProps;
}) {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const propertyTitle = isRTL
    ? property.title.ar || property.title.en
    : property.title.en;

  // Get primary image or first image
  const primaryImage =
    property.media?.find((m) => m.isPrimary)?.url ||
    property.media?.[0]?.url ||
    "/images/property-placeholder.jpg";

  // Format price
  const formatPrice = (amount: number, currency: string, period?: string) => {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "SAR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

    if (period === "MONTH")
      return `${formatted}${t("aqar.propertyCard.perMonth", "/month")}`;
    if (period === "YEAR")
      return `${formatted}${t("aqar.propertyCard.perYear", "/year")}`;
    return formatted;
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (isFavorite) {
        await fetch(`/api/aqar/favorites/${property.id}`, { method: "DELETE" });
      } else {
        await fetch("/api/aqar/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: property.id }),
        });
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      import("../../lib/logger")
        .then(({ logError }) => {
          logError("Failed to toggle favorite", error as Error, {
            component: "PropertyCard",
            action: "toggleFavorite",
            propertyId: property.id,
          });
        })
        .catch((logErr) =>
          logger.error("Failed to load logger:", { error: logErr }),
        );
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Allow default behavior for interactive elements
    const target = e.target as HTMLElement;
    if (target.closest("a") || target.closest("button")) {
      return;
    }
    router.push(`/aqar/properties/${property.slug || property.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      router.push(`/aqar/properties/${property.slug || property.id}`);
    }
  };

  return (
    <article
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      className="block bg-card rounded-2xl shadow-md hover:shadow-xl transition-shadow overflow-hidden group cursor-pointer"
      aria-label={`${t("aqar.propertyCard.viewProperty", "View property")}: ${propertyTitle}`}
    >
      {/* Image Section */}
      <div className="relative h-64 overflow-hidden bg-muted">
        <Image
          src={primaryImage}
          alt={propertyTitle}
          fill
          className={`object-cover group-hover:scale-105 transition-transform duration-300 ${
            isImageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setIsImageLoaded(true)}
        />

        {/* Badges */}
        <div className="absolute top-3 start-3 flex flex-col gap-2">
          {property.featured && (
            <span className="bg-gradient-to-r from-warning to-warning-dark text-white px-3 py-1 rounded-full text-xs font-semibold">
              {t("aqar.propertyCard.featured", "Featured")}
            </span>
          )}
          {property.verified && (
            <span className="bg-success text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              {t("aqar.propertyCard.verified", "Verified")}
            </span>
          )}
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              property.listingType === "SALE"
                ? "bg-primary text-white"
                : "bg-secondary text-white"
            }`}
          >
            {property.listingType === "SALE"
              ? t("aqar.propertyCard.forSale", "For Sale")
              : t("aqar.propertyCard.forRent", "For Rent")}
          </span>
          {property.aiScore !== undefined && (
            <span className="bg-card/80 text-primary border border-primary/30 px-3 py-1 rounded-full text-xs font-semibold">
              {t("aqar.propertyCard.ai", "AI")} {Math.round(property.aiScore)}
            </span>
          )}
          {property.proptech?.smartHomeLevel === "ADVANCED" && (
            <span className="bg-muted text-foreground px-3 py-1 rounded-full text-xs font-semibold">
              {t("aqar.propertyCard.smartHome", "Smart Home")}
            </span>
          )}
          {property.immersive?.vrTour?.ready && (
            <span className="bg-primary/80 text-white px-3 py-1 rounded-full text-xs font-semibold">
              {t("aqar.propertyCard.vr", "VR tour")}
            </span>
          )}
          {property.rnplEligible && (
            <span className="bg-success text-white px-3 py-1 rounded-full text-xs font-semibold">
              {t("aqar.propertyCard.rnpl", "RNPL")}
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={toggleFavorite}
          className="absolute top-3 end-3 p-2 bg-white/90 hover:bg-card rounded-full transition-colors"
          aria-label="Add to favorites"
        >
          <Heart
            className={`w-5 h-5 ${isFavorite ? "fill-destructive text-destructive" : "text-foreground"}`}
          />
        </button>

        {/* Views Counter */}
        {property.views && property.views > 0 && (
          <div className="absolute bottom-3 end-3 bg-black/60 text-white px-2 py-1 rounded-2xl text-xs flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {property.views}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Price */}
        <div className="mb-2">
          <p className="text-2xl font-bold text-foreground">
            {formatPrice(
              property.pricing.amount,
              property.pricing.currency,
              property.pricing.period,
            )}
          </p>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-1">
          {propertyTitle}
        </h3>

        {/* Location */}
        <p className="text-muted-foreground text-sm mb-3 flex items-center gap-1">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="line-clamp-1">
            {property.location.address.district},{" "}
            {property.location.address.city}
          </span>
        </p>

        {/* Property Type */}
        <p className="text-muted-foreground text-xs mb-3">
          {property.propertyType.replace(/_/g, " ")}
          {property.features.furnished &&
            ` • ${property.features.furnished.replace(/_/g, " ")}`}
        </p>

        {/* Features */}
        <div className="flex items-center gap-4 text-foreground text-sm mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-1">
            <Bed className="w-4 h-4" />
            <span>{property.features.bedrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="w-4 h-4" />
            <span>{property.features.bathrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <Maximize className="w-4 h-4" />
            <span>
              {property.features.area.built} {property.features.area.unit}
            </span>
          </div>
        </div>

        {/* Agent Info (if available) */}
        {property.agentId && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {property.agentId.photo ? (
                <Image
                  src={property.agentId.photo}
                  alt="Agent"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {property.agentId.firstName?.[0]}
                    {property.agentId.lastName?.[0]}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {property.agentId.firstName} {property.agentId.lastName}
                </p>
              </div>
            </div>

            {property.agentId.contact?.phone && (
              <ContactActions
                phone={property.agentId.contact.phone}
                whatsapp={property.agentId.contact.phone}
                variant="icon"
              />
            )}
          </div>
        )}
      </div>
    </article>
  );
}
