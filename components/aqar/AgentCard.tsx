'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, Phone, MessageSquare, Award, TrendingUp, CheckCircle } from 'lucide-react';
import { useState } from 'react';

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
  const [_showContact, _setShowContact] = useState(false);

  const fullName = agent.displayName || `${agent.firstName} ${agent.lastName}`;

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
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
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
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFB400] to-[#FF8C00] flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {agent.firstName?.trim()?.[0] ?? ''}{agent.lastName?.trim()?.[0] ?? ''}
              </span>
            </div>
          )}
          {agent.verified && (
            <div className="absolute -bottom-1 -right-1 bg-green-600 rounded-full p-0.5">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Agent Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 truncate">{fullName}</h4>
            {agent.tier !== 'BASIC' && (
              <span className="text-xs">
                {agent.tier === 'ELITE' ? '👑' : '⭐'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span>{typeof agent.statistics?.averageRating === 'number' && !isNaN(agent.statistics.averageRating) ? agent.statistics.averageRating.toFixed(1) : 'N/A'}</span>
            <span className="text-gray-400">•</span>
            <span>{agent.statistics.activeListings} listings</span>
          </div>
        </div>

        {/* Contact Buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => window.location.href = `tel:${agent.contact.phone}`}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Call agent"
          >
            <Phone className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => window.open(`https://wa.me/${agent.contact.whatsapp || agent.contact.phone}`, '_blank')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="WhatsApp agent"
          >
            <MessageSquare className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <Link 
      href={`/aqar/agents/${agent.id}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden group"
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
                <div className="absolute -bottom-1 -right-1 bg-green-600 rounded-full p-1">
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
              Featured
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* License Info */}
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${agent.license.verified ? 'text-green-600' : 'text-gray-400'}`} />
            <div>
              <p className="font-medium text-gray-900">
                License: {agent.license.number}
              </p>
              <p className="text-gray-600 text-xs">
                {agent.license.authority} {agent.license.verified && '• Verified'}
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{agent.statistics.activeListings}</p>
            <p className="text-xs text-gray-600">Active Listings</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{agent.statistics.soldProperties + agent.statistics.rentedProperties}</p>
            <p className="text-xs text-gray-600">Properties Closed</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <p className="text-2xl font-bold text-gray-900">{typeof agent.statistics?.averageRating === 'number' && !isNaN(agent.statistics.averageRating) ? agent.statistics.averageRating.toFixed(1) : 'N/A'}</p>
            </div>
            <p className="text-xs text-gray-600">{agent.statistics.totalReviews} Reviews</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{agent.statistics.responseTime}m</p>
            <p className="text-xs text-gray-600">Avg Response</p>
          </div>
        </div>

        {/* Experience & Specializations */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="font-medium">{agent.experience} years experience</span>
          </div>
          
          {agent.specializations.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {agent.specializations.map((spec, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
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
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {lang}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bio */}
        {agent.bio?.en && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {agent.bio.en}
          </p>
        )}

        {/* Contact Buttons */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              window.location.href = `tel:${agent.contact.phone}`;
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FFB400] to-[#FF8C00] text-white rounded-lg hover:shadow-lg transition-shadow"
          >
            <Phone className="w-4 h-4" />
            <span className="font-semibold">Call</span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              window.open(`https://wa.me/${agent.contact.whatsapp || agent.contact.phone}`, '_blank');
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:shadow-lg transition-shadow"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="font-semibold">WhatsApp</span>
          </button>
        </div>
      </div>
    </Link>
  );
}
