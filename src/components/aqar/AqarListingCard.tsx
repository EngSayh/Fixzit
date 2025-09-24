'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Bed, Bath, Square, Heart, Eye, Phone, MessageCircle } from 'lucide-react';

interface AqarListingCardProps {
  listing: {
    _id: string;
    slug: string;
    title: string;
    description: string;
    purpose: 'sale' | 'rent' | 'daily';
    propertyType: string;
    price: {
      amount: number;
      currency: string;
      period: string;
    };
    specifications: {
      area: number;
      bedrooms?: number;
      bathrooms?: number;
      livingRooms?: number;
      furnished: boolean;
      parking?: number;
      balcony?: boolean;
      pool?: boolean;
      gym?: boolean;
      security?: boolean;
      elevator?: boolean;
    };
    location: {
      city: string;
      district: string;
      neighborhood?: string;
    };
    media: Array<{
      url: string;
      alt?: string;
      type: 'image' | 'video';
      isCover: boolean;
    }>;
    contact: {
      name: string;
      phone: string;
      whatsapp?: string;
      isVerified: boolean;
    };
    isVerified: boolean;
    isFeatured: boolean;
    isPremium: boolean;
    views: number;
    favorites: number;
    publishedAt: string;
  };
  lang?: 'ar' | 'en';
}

export default function AqarListingCard({ listing, lang = 'ar' }: AqarListingCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [imageError, setImageError] = useState(false);

  const t = (ar: string, en: string) => lang === 'ar' ? ar : en;

  const formatPrice = (amount: number, currency: string, period: string) => {
    const formattedAmount = amount.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US');
    const periodText = {
      total: t('', ''),
      monthly: t('/شهر', '/month'),
      yearly: t('/سنة', '/year'),
      daily: t('/يوم', '/day')
    }[period];
    
    return `${formattedAmount} ${currency}${periodText}`;
  };

  const getPropertyTypeLabel = (type: string) => {
    const types: Record<string, { ar: string; en: string }> = {
      apartment: { ar: 'شقة', en: 'Apartment' },
      villa: { ar: 'فيلا', en: 'Villa' },
      land: { ar: 'أرض', en: 'Land' },
      office: { ar: 'مكتب', en: 'Office' },
      shop: { ar: 'محل', en: 'Shop' },
      building: { ar: 'عمارة', en: 'Building' },
      floor: { ar: 'دور', en: 'Floor' },
      room: { ar: 'غرفة', en: 'Room' }
    };
    
    return types[type] ? t(types[type].ar, types[type].en) : type;
  };

  const getPurposeLabel = (purpose: string) => {
    const purposes: Record<string, { ar: string; en: string }> = {
      sale: { ar: 'للبيع', en: 'For Sale' },
      rent: { ar: 'للإيجار', en: 'For Rent' },
      daily: { ar: 'إيجار يومي', en: 'Daily Rent' }
    };
    
    return purposes[purpose] ? t(purposes[purpose].ar, purposes[purpose].en) : purpose;
  };

  const coverImage = listing.media.find(m => m.isCover) || listing.media[0];
  const fallbackImage = '/images/placeholder-property.jpg';

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Image Section */}
      <div className="relative h-64 bg-gray-200">
        {coverImage && !imageError ? (
          <Image
            src={coverImage.url}
            alt={coverImage.alt || listing.title}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <Square className="w-16 h-16 text-gray-400" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {listing.isFeatured && (
            <span className="px-2 py-1 bg-[#FFB400] text-black text-xs font-medium rounded">
              {t('مميز', 'Featured')}
            </span>
          )}
          {listing.isPremium && (
            <span className="px-2 py-1 bg-[#0061A8] text-white text-xs font-medium rounded">
              {t('مميز', 'Premium')}
            </span>
          )}
          {listing.isVerified && (
            <span className="px-2 py-1 bg-[#00A859] text-white text-xs font-medium rounded">
              {t('موثوق', 'Verified')}
            </span>
          )}
        </div>

        {/* Purpose Badge */}
        <div className="absolute top-3 right-3">
          <span className="px-3 py-1 bg-black/70 text-white text-sm font-medium rounded">
            {getPurposeLabel(listing.purpose)}
          </span>
        </div>

        {/* Favorite Button */}
        <button
          onClick={() => setIsFavorited(!isFavorited)}
          className="absolute bottom-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
        >
          <Heart 
            className={`w-5 h-5 ${isFavorited ? 'text-red-500 fill-current' : 'text-gray-600'}`} 
          />
        </button>

        {/* View Count */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 bg-black/70 text-white text-xs rounded">
          <Eye className="w-3 h-3" />
          {listing.views}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Price */}
        <div className="text-2xl font-bold text-[#0061A8] mb-2">
          {formatPrice(listing.price.amount, listing.price.currency, listing.price.period)}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {listing.title}
        </h3>

        {/* Property Type */}
        <div className="text-sm text-gray-600 mb-2">
          {getPropertyTypeLabel(listing.propertyType)}
        </div>

        {/* Location */}
        <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
          <MapPin className="w-4 h-4" />
          <span>{listing.location.district}, {listing.location.city}</span>
        </div>

        {/* Specifications */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <Square className="w-4 h-4" />
            <span>{listing.specifications.area} م²</span>
          </div>
          
          {listing.specifications.bedrooms && (
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              <span>{listing.specifications.bedrooms} {t('غرف', 'BR')}</span>
            </div>
          )}
          
          {listing.specifications.bathrooms && (
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4" />
              <span>{listing.specifications.bathrooms} {t('حمام', 'BA')}</span>
            </div>
          )}
          
          {listing.specifications.parking && listing.specifications.parking > 0 && (
            <div className="flex items-center gap-1">
              <span>🚗</span>
              <span>{listing.specifications.parking} {t('موقف', 'Parking')}</span>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-2 mb-4">
          {listing.specifications.furnished && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
              {t('مفروش', 'Furnished')}
            </span>
          )}
          {listing.specifications.balcony && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              {t('بلكونة', 'Balcony')}
            </span>
          )}
          {listing.specifications.pool && (
            <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs rounded">
              {t('مسبح', 'Pool')}
            </span>
          )}
          {listing.specifications.gym && (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
              {t('جيم', 'Gym')}
            </span>
          )}
          {listing.specifications.security && (
            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
              {t('أمن', 'Security')}
            </span>
          )}
          {listing.specifications.elevator && (
            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
              {t('مصعد', 'Elevator')}
            </span>
          )}
        </div>

        {/* Contact Info */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {listing.contact.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {listing.contact.name}
                {listing.contact.isVerified && (
                  <span className="ml-1 text-[#00A859]">✓</span>
                )}
              </div>
              <div className="text-xs text-gray-600">
                {t('معلن موثوق', 'Verified Advertiser')}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/aqar/${listing.slug || listing._id}`}
              className="px-4 py-2 bg-[#0061A8] text-white text-sm font-medium rounded-lg hover:bg-[#0056a3] transition-colors"
            >
              {t('عرض التفاصيل', 'View Details')}
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-3">
          <a
            href={`tel:${listing.contact.phone}`}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <Phone className="w-4 h-4" />
            {t('اتصال', 'Call')}
          </a>
          
          {listing.contact.whatsapp && (
            <a
              href={`https://wa.me/${listing.contact.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#25D366] text-white text-sm font-medium rounded-lg hover:bg-[#20c55a] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              {t('واتساب', 'WhatsApp')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}