"use client";

import Link from "next/link";
import { Map, Building2, Home, Search, Filter, Heart, TrendingUp, Star } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";

type FeatureConfig = {
  titleKey: string;
  descriptionKey: string;
  icon: typeof Map;
  link: string;
  fallbackTitle: string;
  fallbackDescription: string;
};

const AQAR_FEATURES: FeatureConfig[] = [
  {
    titleKey: 'aqar.interactiveMap',
    descriptionKey: 'aqar.interactiveMap.desc',
    icon: Map,
    link: '/aqar/map',
    fallbackTitle: 'Interactive Property Map',
    fallbackDescription: 'Explore properties on an interactive map with real-time data'
  },
  {
    titleKey: 'aqar.searchProperties',
    descriptionKey: 'aqar.propertySearch.desc',
    icon: Search,
    link: '/aqar/search',
    fallbackTitle: 'Property Search',
    fallbackDescription: 'Advanced search with filters for location, price, and features'
  },
  {
    titleKey: 'aqar.propertyListings',
    descriptionKey: 'aqar.propertyListings.desc',
    icon: Building2,
    link: '/aqar/properties',
    fallbackTitle: 'Property Listings',
    fallbackDescription: 'Browse detailed property listings with photos and specifications'
  },
  {
    titleKey: 'aqar.myListings',
    descriptionKey: 'aqar.myListings.desc',
    icon: Home,
    link: '/aqar/listings',
    fallbackTitle: 'My Listings',
    fallbackDescription: 'Manage your property listings and inquiries'
  },
  {
    titleKey: 'aqar.advancedFilters',
    descriptionKey: 'aqar.advancedFilters.desc',
    icon: Filter,
    link: '/aqar/filters',
    fallbackTitle: 'Advanced Filters',
    fallbackDescription: 'Filter properties by location, price range, property type, and more'
  },
  {
    titleKey: 'aqar.favorites',
    descriptionKey: 'aqar.favorites.desc',
    icon: Heart,
    link: '/aqar/favorites',
    fallbackTitle: 'Favorites',
    fallbackDescription: 'Save and organize your favorite properties'
  },
  {
    titleKey: 'aqar.marketTrends',
    descriptionKey: 'aqar.marketTrends.desc',
    icon: TrendingUp,
    link: '/aqar/trends',
    fallbackTitle: 'Market Trends',
    fallbackDescription: 'View market analysis and property value trends'
  },
  {
    titleKey: 'aqar.premiumListings',
    descriptionKey: 'aqar.premiumListings.desc',
    icon: Star,
    link: '/aqar/premium',
    fallbackTitle: 'Premium Listings',
    fallbackDescription: 'Access exclusive premium property listings'
  }
];

export default function AqarPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[hsl(var(--warning))] to-[hsl(var(--warning))] text-white py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {t('aqar.title', 'Aqar Souq')}
          </h1>
          <p className="text-xl mb-8 text-white/90 max-w-3xl mx-auto">
            {t('aqar.subtitle', 'Discover and invest in real estate properties across the region')}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/aqar/map"
              className="px-6 py-3 bg-card hover:bg-muted/80 text-warning font-semibold rounded-2xl transition-colors"
            >
              {t('aqar.exploreMap', 'Explore Map')}
            </Link>
            <Link
              href="/aqar/search"
              className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-2xl transition-colors"
            >
              {t('aqar.searchProperties', 'Search Properties')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            {t('aqar.realEstateFeatures', 'Real Estate Features')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AQAR_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.titleKey}
                  href={feature.link}
                  className="bg-card p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-border group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-warning/10 rounded-2xl group-hover:bg-warning/20 transition-colors">
                      <Icon className="h-6 w-6 text-warning" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 text-foreground group-hover:text-warning">
                        {t(feature.titleKey, feature.fallbackTitle)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t(feature.descriptionKey, feature.fallbackDescription)}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
