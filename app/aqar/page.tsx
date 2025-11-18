"use client";

import Link from "next/link";
import { Map as MapIcon, Building2, Home, Search, Filter, Heart, TrendingUp, Star, Gavel, ShieldCheck, BadgeDollarSign, PlaySquare, Sparkles, Bot, Cloud } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import VRTour from "@/components/aqar/VRTour";

type FeatureConfig = {
  titleKey: string;
  descriptionKey: string;
  icon: typeof MapIcon;
  link: string;
  fallbackTitle: string;
  fallbackDescription: string;
};

const AQAR_FEATURES: FeatureConfig[] = [
  {
    titleKey: 'aqar.interactiveMap',
    descriptionKey: 'aqar.interactiveMap.desc',
    icon: MapIcon,
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
    titleKey: 'aqar.auctions',
    descriptionKey: 'aqar.auctions.desc',
    icon: Gavel,
    link: '/aqar/filters?intent=AUCTION',
    fallbackTitle: 'Auctions & Deposits',
    fallbackDescription: 'Bid-ready listings with reserve prices, deposits, and REGA compliance'
  },
  {
    titleKey: 'aqar.rnpl',
    descriptionKey: 'aqar.rnpl.desc',
    icon: BadgeDollarSign,
    link: '/aqar/filters?rnplEligible=true',
    fallbackTitle: 'RNPL Financing',
    fallbackDescription: 'Calculate Rent-Now-Pay-Later plans powered by Rize / Ejari partners'
  },
  {
    titleKey: 'aqar.vrTours',
    descriptionKey: 'aqar.vrTours.desc',
    icon: PlaySquare,
    link: '/aqar/properties',
    fallbackTitle: 'VR / 3D Tours',
    fallbackDescription: 'Walk through properties with immersive VR embeds'
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

      {/* Innovation Rail */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto grid gap-4 md:grid-cols-3">
          <div className="p-5 bg-card rounded-2xl border border-border space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              {t('aqar.superpowers.ai.title', 'محرك التوصيات الذكي')}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('aqar.superpowers.ai.desc', 'يتعلم من مشاهدات Fixzit Souq ويقترح عقارات جاهزة للتمويل.') }
            </p>
          </div>
          <div className="p-5 bg-card rounded-2xl border border-border space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Bot className="w-4 h-4 text-success" />
              {t('aqar.superpowers.assistant.title', 'مساعد AR/VR + RNPL')}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('aqar.superpowers.assistant.desc', 'جولات افتراضية، دعم مباشر، وتوقيع زاتكا في نفس الجلسة.')}
            </p>
          </div>
          <div className="p-5 bg-card rounded-2xl border border-border space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Cloud className="w-4 h-4 text-warning" />
              {t('aqar.superpowers.offline.title', 'حزم Offline للميدان')}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('aqar.superpowers.offline.desc', 'حمّل القوائم، الخرائط، وبيانات IoT للاستخدام دون إنترنت للمشاريع البعيدة.')}
            </p>
          </div>
        </div>
      </section>

      {/* Compliance & Finance */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-muted/50 border-t border-border">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Compliance & Finance</p>
            <h3 className="text-3xl font-bold text-foreground mt-2">{t('aqar.compliance.title', 'Enterprise-grade trust')}</h3>
            <p className="text-muted-foreground mt-3 max-w-3xl mx-auto">
              {t('aqar.compliance.desc', 'Mandatory Nafath, FAL, foreign ownership checks and RNPL financing baked into every listing.')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-2xl border border-border p-5 space-y-2">
              <ShieldCheck className="w-8 h-8 text-primary" />
              <h4 className="font-semibold text-foreground">{t('aqar.compliance.nafath', 'Nafath & FAL')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('aqar.compliance.nafath.desc', 'Agents must pass Nafath identity checks plus FAL/ad permit validation before publishing.')}
              </p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-5 space-y-2">
              <Gavel className="w-8 h-8 text-warning" />
              <h4 className="font-semibold text-foreground">{t('aqar.compliance.foreign', 'Foreign ownership')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('aqar.compliance.foreign.desc', 'Foreign-owner flag, REGA zone controls, and audit history for every listing.')}
              </p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-5 space-y-2">
              <BadgeDollarSign className="w-8 h-8 text-success" />
              <h4 className="font-semibold text-foreground">{t('aqar.compliance.rnpl', 'RNPL journeys')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('aqar.compliance.rnpl.desc', 'Instant Rent-Now-Pay-Later eligibility, installment calculators, and lead routing to fintech partners.')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/aqar/filters?intent=AUCTION" className="px-5 py-2 rounded-full border border-border text-sm hover:bg-card">
              {t('aqar.compliance.auctionCta', 'Browse auctions')}
            </Link>
            <Link href="/aqar/filters?rnplEligible=true" className="px-5 py-2 rounded-full bg-primary text-white text-sm hover:bg-primary/90">
              {t('aqar.compliance.rnplCta', 'Check RNPL eligibility')}
            </Link>
          </div>
        </div>
      </section>

      {/* VR Tour Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t('aqar.vr.tag', 'Immersive')}</p>
            <h3 className="text-3xl font-bold text-foreground mt-2">{t('aqar.vr.title', 'VR + 3D walkthroughs')}</h3>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              {t('aqar.vr.desc', 'Invite buyers to explore every floor, balcony, and amenity using Matterport / 3D tours directly inside the Fixzit shell.')}
            </p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li>• {t('aqar.vr.point1', 'Supports Matterport, Kuula, and custom WebXR sources')}</li>
              <li>• {t('aqar.vr.point2', 'Auto-fallback to photo carousel if device does not support VR')}</li>
              <li>• {t('aqar.vr.point3', 'Audited for accessibility and performance')}</li>
            </ul>
          </div>
          <VRTour url="https://my.matterport.com/show/?m=Hgd2w8iu8xv" title={t('aqar.vr.demo', 'Sedra Show Home')} />
        </div>
      </section>
    </div>
  );
}
