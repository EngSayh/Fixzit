'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, Award, TrendingUp, CheckCircle } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { ContactActions } from './ContactActions';

export interface AgentCardProps {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  photo?: string;
  bio?: {
    en?: string;
    ar?: string;
  };
  license: {
    number: string;
    authority: string;
    verified: boolean;
  };
  specializations: string[];
  languages: string[];
  experience: number;
  contact: {
    phone: string;
    whatsapp?: string;
    email: string;
  };
  statistics: {
    totalListings: number;
    activeListings: number;
    soldProperties: number;
    rentedProperties: number;
    averageRating: number;
    totalReviews: number;
    responseTime: number;
  };
  tier: 'BASIC' | 'PREMIUM' | 'ELITE';
  verified: boolean;
  featured: boolean;
}

export default function AgentCard({ agent, compact = false }: { agent: AgentCardProps; compact?: boolean }) {
  const { t, isRTL } = useTranslation();

  const fullName = agent.displayName || `${agent.firstName} ${agent.lastName}`;
  const bioText = isRTL ? (agent.bio?.ar || agent.bio?.en) : (agent.bio?.en || agent.bio?.ar);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'ELITE':
        return 'from-purple-600 to-purple-800';
      case 'PREMIUM':
        return 'from-blue-600 to-blue-800';
      default:
        return 'from-gray-600 to-gray-800';
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'ELITE':
        return '👑 Elite Agent';
      case 'PREMIUM':
        return '⭐ Premium Agent';
      default:
        return 'Agent';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-card rounded-2xl border border-border hover:shadow-md transition-shadow">
        {/* Agent Photo */}
        <div className="relative">
          {agent.photo ? (
            <Image
              src={agent.photo}
              alt={fullName}
              width={48}
              height={48}
              className="rounded-full"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-warning to-warning-dark flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {agent.firstName?.trim()?.[0] ?? ''}{agent.lastName?.trim()?.[0] ?? ''}
              </span>
            </div>
          )}
          {agent.verified && (
            <div className="absolute -bottom-1 -end-1 bg-success rounded-full p-0.5">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Agent Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground truncate">{fullName}</h4>
            {agent.tier !== 'BASIC' && (
              <span className="text-xs">
                {agent.tier === 'ELITE' ? '👑' : '⭐'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="w-3 h-3 fill-warning text-warning" />
            <span>{typeof agent.statistics?.averageRating === 'number' && !isNaN(agent.statistics.averageRating) ? agent.statistics.averageRating.toFixed(1) : 'N/A'}</span>
            <span className="text-muted-foreground">•</span>
            <span>{agent.statistics.activeListings} {t('aqar.agent.listings', 'listings')}</span>
          </div>
        </div>

        {/* Contact Buttons */}
        {agent.contact?.phone && (
          <ContactActions 
            phone={agent.contact.phone}
            whatsapp={agent.contact.whatsapp}
            variant="icon"
          />
        )}
      </div>
    );
  }

  return (
    <Link 
      href={`/aqar/properties?agent=${agent.id}`}
      className="block bg-card rounded-2xl shadow-md hover:shadow-xl transition-shadow overflow-hidden group"
    >
      {/* Header with Tier Badge */}
      <div className={`bg-gradient-to-r ${getTierColor(agent.tier)} p-4 text-white`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Agent Photo */}
            <div className="relative">
              {agent.photo ? (
                <Image
                  src={agent.photo}
                  alt={fullName}
                  width={80}
                  height={80}
                  className="rounded-full border-4 border-white/20"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/20 flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">
                    {agent.firstName?.trim()?.[0] ?? ''}{agent.lastName?.trim()?.[0] ?? ''}
                  </span>
                </div>
              )}
              {agent.verified && (
                <div className="absolute -bottom-1 -end-1 bg-success rounded-full p-1">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Agent Name & Tier */}
            <div>
              <h3 className="text-xl font-bold mb-1">{fullName}</h3>
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <Award className="w-4 h-4" />
                <span>{getTierBadge(agent.tier)}</span>
              </div>
            </div>
          </div>

          {agent.featured && (
            <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold">
              {t('aqar.propertyCard.featured', 'Featured')}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* License Info */}
        <div className="mb-4 pb-4 border-b border-border">
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${agent.license.verified ? 'text-success' : 'text-muted-foreground'}`} />
            <div>
              <p className="font-medium text-foreground">
                {t('aqar.agent.license', 'License')}: {agent.license.number}
              </p>
              <p className="text-muted-foreground text-xs">
                {agent.license.authority} {agent.license.verified && `• ${t('aqar.agent.verified', 'Verified')}`}
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-muted rounded-2xl">
            <p className="text-2xl font-bold text-foreground">{agent.statistics.activeListings}</p>
            <p className="text-xs text-muted-foreground">{t('aqar.agent.listings', 'Active Listings')}</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-2xl">
            <p className="text-2xl font-bold text-foreground">{agent.statistics.soldProperties + agent.statistics.rentedProperties}</p>
            <p className="text-xs text-muted-foreground">{t('aqar.agent.propertiesClosed', 'Properties Closed')}</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-2xl">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-warning text-warning" />
              <p className="text-2xl font-bold text-foreground">{typeof agent.statistics?.averageRating === 'number' && !isNaN(agent.statistics.averageRating) ? agent.statistics.averageRating.toFixed(1) : 'N/A'}</p>
            </div>
            <p className="text-xs text-muted-foreground">{agent.statistics.totalReviews} Reviews</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-2xl">
            <p className="text-2xl font-bold text-foreground">{agent.statistics.responseTime}m</p>
            <p className="text-xs text-muted-foreground">{t('aqar.agent.avgResponse', 'Avg Response')}</p>
          </div>
        </div>

        {/* Experience & Specializations */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{agent.experience} {t('aqar.agent.yearsExperience', 'years experience')}</span>
          </div>
          
          {agent.specializations.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {agent.specializations.map((spec, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                >
                  {spec}
                </span>
              ))}
            </div>
          )}

          {agent.languages.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {agent.languages.map((lang, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-muted text-foreground text-xs rounded-full"
                >
                  {lang}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bio */}
        {bioText && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {bioText}
          </p>
        )}

        {/* Contact Buttons */}
        <ContactActions 
          phone={agent.contact.phone}
          whatsapp={agent.contact.whatsapp}
          variant="full"
        />
      </div>
    </Link>
  );
}
