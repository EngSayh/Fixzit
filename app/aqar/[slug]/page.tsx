'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Car, 
  Heart, 
  Share2, 
  Phone, 
  MessageCircle, 
  ArrowLeft,
  Star,
  Shield,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ListingDetail {
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
    floors?: number;
    age?: string;
    furnished: boolean;
    parking?: number;
    balcony?: boolean;
    garden?: boolean;
    pool?: boolean;
    gym?: boolean;
    security?: boolean;
    elevator?: boolean;
    maidRoom?: boolean;
  };
  location: {
    lat: number;
    lng: number;
    address?: string;
    city: string;
    district: string;
    neighborhood?: string;
    postalCode?: string;
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
    email?: string;
    company?: string;
    licenseNumber?: string;
    isVerified: boolean;
  };
  isVerified: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  license: {
    number?: string;
    expiryDate?: string;
    source: string;
    isValid: boolean;
  };
  views: number;
  favorites: number;
  inquiries: number;
  keywords: string[];
  tags: string[];
  publishedAt: string;
  createdAt: string;
  similarListings?: any[];
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  });

  useEffect(() => {
    if (params.slug) {
      fetchListing();
    }
  }, [params.slug]);

  const fetchListing = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/aqar/listings/${params.slug}`);
      const data = await response.json();
      
      if (data.success) {
        setListing(data.data.listing);
      } else {
        setError(data.error || 'Listing not found');
      }
    } catch (err) {
      setError('Failed to fetch listing');
      console.error('Error fetching listing:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;

    try {
      const response = await fetch(`/api/aqar/listings/${listing._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactForm),
      });

      if (response.ok) {
        alert(lang === 'ar' ? 'تم إرسال رسالتك بنجاح!' : 'Your message has been sent successfully!');
        setContactForm({ name: '', phone: '', email: '', message: '' });
        setShowContactForm(false);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const nextImage = () => {
    if (listing?.media) {
      setCurrentImageIndex((prev) => 
        prev === listing.media.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (listing?.media) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? listing.media.length - 1 : prev - 1
      );
    }
  };

  const formatPrice = (amount: number, currency: string, period: string) => {
    const formattedAmount = amount.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US');
    const periodText = {
      total: '',
      monthly: lang === 'ar' ? '/شهر' : '/month',
      yearly: lang === 'ar' ? '/سنة' : '/year',
      daily: lang === 'ar' ? '/يوم' : '/day'
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
    
    return types[type] ? (lang === 'ar' ? types[type].ar : types[type].en) : type;
  };

  const getPurposeLabel = (purpose: string) => {
    const purposes: Record<string, { ar: string; en: string }> = {
      sale: { ar: 'للبيع', en: 'For Sale' },
      rent: { ar: 'للإيجار', en: 'For Rent' },
      daily: { ar: 'إيجار يومي', en: 'Daily Rent' }
    };
    
    return purposes[purpose] ? (lang === 'ar' ? purposes[purpose].ar : purposes[purpose].en) : purpose;
  };

  const t = (ar: string, en: string) => lang === 'ar' ? ar : en;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0061A8] mx-auto mb-4"></div>
          <p className="text-gray-600">{t('جاري التحميل...', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('العقار غير موجود', 'Property Not Found')}
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-[#0061A8] text-white rounded-lg hover:bg-[#0056a3] transition-colors"
          >
            {t('العودة', 'Go Back')}
          </button>
        </div>
      </div>
    );
  }

  const currentImage = listing.media[currentImageIndex];

  return (
    <div className="min-h-screen bg-gray-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('العودة', 'Back')}
            </button>

            <div className="flex items-center gap-4">
              {/* Language Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setLang('ar')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    lang === 'ar' ? 'bg-white text-[#0061A8]' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  العربية
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    lang === 'en' ? 'bg-white text-[#0061A8]' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  English
                </button>
              </div>

              <button
                onClick={() => setIsFavorited(!isFavorited)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'text-red-500 fill-current' : 'text-gray-600'}`} />
              </button>

              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Share2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="relative h-96 bg-gray-200">
                {currentImage ? (
                  <Image
                    src={currentImage.url}
                    alt={currentImage.alt || listing.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Square className="w-16 h-16 text-gray-400" />
                  </div>
                )}

                {/* Navigation Arrows */}
                {listing.media.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}

                {/* Image Counter */}
                <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                  {currentImageIndex + 1} / {listing.media.length}
                </div>

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {listing.isFeatured && (
                    <span className="px-3 py-1 bg-[#FFB400] text-black text-sm font-medium rounded">
                      {t('مميز', 'Featured')}
                    </span>
                  )}
                  {listing.isPremium && (
                    <span className="px-3 py-1 bg-[#0061A8] text-white text-sm font-medium rounded">
                      {t('مميز', 'Premium')}
                    </span>
                  )}
                  {listing.isVerified && (
                    <span className="px-3 py-1 bg-[#00A859] text-white text-sm font-medium rounded">
                      {t('موثوق', 'Verified')}
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnail Strip */}
              {listing.media.length > 1 && (
                <div className="p-4">
                  <div className="flex gap-2 overflow-x-auto">
                    {listing.media.map((media, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                          index === currentImageIndex ? 'border-[#0061A8]' : 'border-gray-200'
                        }`}
                      >
                        <Image
                          src={media.url}
                          alt={media.alt || listing.title}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Property Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>
                  <div className="flex items-center gap-4 text-gray-600">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {listing.location.district}, {listing.location.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {listing.views} {t('مشاهدة', 'views')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(listing.publishedAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-[#0061A8]">
                    {formatPrice(listing.price.amount, listing.price.currency, listing.price.period)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {getPurposeLabel(listing.purpose)} • {getPropertyTypeLabel(listing.propertyType)}
                  </div>
                </div>
              </div>

              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">{listing.description}</p>
              </div>
            </div>

            {/* Specifications */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {t('مواصفات العقار', 'Property Specifications')}
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Square className="w-5 h-5 text-[#0061A8]" />
                  <div>
                    <div className="text-sm text-gray-600">{t('المساحة', 'Area')}</div>
                    <div className="font-semibold">{listing.specifications.area} م²</div>
                  </div>
                </div>

                {listing.specifications.bedrooms && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Bed className="w-5 h-5 text-[#0061A8]" />
                    <div>
                      <div className="text-sm text-gray-600">{t('غرف النوم', 'Bedrooms')}</div>
                      <div className="font-semibold">{listing.specifications.bedrooms}</div>
                    </div>
                  </div>
                )}

                {listing.specifications.bathrooms && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Bath className="w-5 h-5 text-[#0061A8]" />
                    <div>
                      <div className="text-sm text-gray-600">{t('دورات المياه', 'Bathrooms')}</div>
                      <div className="font-semibold">{listing.specifications.bathrooms}</div>
                    </div>
                  </div>
                )}

                {listing.specifications.parking && listing.specifications.parking > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Car className="w-5 h-5 text-[#0061A8]" />
                    <div>
                      <div className="text-sm text-gray-600">{t('مواقف السيارات', 'Parking')}</div>
                      <div className="font-semibold">{listing.specifications.parking}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {t('المميزات', 'Features')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {listing.specifications.furnished && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                      {t('مفروش', 'Furnished')}
                    </span>
                  )}
                  {listing.specifications.balcony && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {t('بلكونة', 'Balcony')}
                    </span>
                  )}
                  {listing.specifications.pool && (
                    <span className="px-3 py-1 bg-cyan-100 text-cyan-800 text-sm rounded-full">
                      {t('مسبح', 'Pool')}
                    </span>
                  )}
                  {listing.specifications.gym && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                      {t('جيم', 'Gym')}
                    </span>
                  )}
                  {listing.specifications.security && (
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
                      {t('أمن', 'Security')}
                    </span>
                  )}
                  {listing.specifications.elevator && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                      {t('مصعد', 'Elevator')}
                    </span>
                  )}
                  {listing.specifications.maidRoom && (
                    <span className="px-3 py-1 bg-pink-100 text-pink-800 text-sm rounded-full">
                      {t('غرفة خادمة', 'Maid Room')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {t('الموقع', 'Location')}
              </h2>
              <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-600">
                  <MapPin className="w-12 h-12 mx-auto mb-2" />
                  <p>{t('خريطة الموقع', 'Location Map')}</p>
                  <p className="text-sm">{listing.location.address || `${listing.location.district}, ${listing.location.city}`}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t('معلومات الاتصال', 'Contact Information')}
              </h3>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-lg font-medium text-gray-600">
                    {listing.contact.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    {listing.contact.name}
                    {listing.contact.isVerified && (
                      <Shield className="w-4 h-4 text-[#00A859]" />
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t('معلن موثوق', 'Verified Advertiser')}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <a
                  href={`tel:${listing.contact.phone}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  {t('اتصال', 'Call')}
                </a>

                {listing.contact.whatsapp && (
                  <a
                    href={`https://wa.me/${listing.contact.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] text-white rounded-lg hover:bg-[#20c55a] transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {t('واتساب', 'WhatsApp')}
                  </a>
                )}

                <button
                  onClick={() => setShowContactForm(!showContactForm)}
                  className="w-full px-4 py-3 border border-[#0061A8] text-[#0061A8] rounded-lg hover:bg-[#0061A8] hover:text-white transition-colors"
                >
                  {t('إرسال رسالة', 'Send Message')}
                </button>
              </div>

              {showContactForm && (
                <form onSubmit={handleContactSubmit} className="mt-4 space-y-3">
                  <input
                    type="text"
                    placeholder={t('الاسم', 'Name')}
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
                    required
                  />
                  <input
                    type="tel"
                    placeholder={t('رقم الهاتف', 'Phone Number')}
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
                    required
                  />
                  <input
                    type="email"
                    placeholder={t('البريد الإلكتروني', 'Email')}
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
                  />
                  <textarea
                    placeholder={t('رسالتك', 'Your Message')}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#0056a3] transition-colors"
                  >
                    {t('إرسال', 'Send')}
                  </button>
                </form>
              )}
            </div>

            {/* License Information */}
            {listing.license.number && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {t('معلومات الترخيص', 'License Information')}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('رقم الترخيص', 'License Number')}:</span>
                    <span className="font-medium">{listing.license.number}</span>
                  </div>
                  {listing.license.expiryDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('تاريخ الانتهاء', 'Expiry Date')}:</span>
                      <span className="font-medium">
                        {new Date(listing.license.expiryDate).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('المصدر', 'Source')}:</span>
                    <span className="font-medium">{listing.license.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('الحالة', 'Status')}:</span>
                    <span className={`font-medium ${listing.license.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {listing.license.isValid ? t('صالح', 'Valid') : t('منتهي الصلاحية', 'Expired')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Similar Properties */}
            {listing.similarListings && listing.similarListings.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {t('عقارات مشابهة', 'Similar Properties')}
                </h3>
                <div className="space-y-3">
                  {listing.similarListings.slice(0, 3).map((similar: any) => (
                    <div key={similar._id} className="flex gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{similar.title}</h4>
                        <p className="text-sm text-[#0061A8] font-semibold">
                          {formatPrice(similar.price.amount, similar.price.currency, similar.price.period)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {similar.location.district}, {similar.location.city}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}