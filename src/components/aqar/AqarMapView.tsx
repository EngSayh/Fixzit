'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, ZoomIn, ZoomOut, Navigation } from 'lucide-react';

interface AqarMapViewProps {
  listings?: Array<{
    _id: string;
    title: string;
    location: {
      lat: number;
      lng: number;
      city: string;
      district: string;
    };
    price: {
      amount: number;
      currency: string;
    };
    specifications: {
      area: number;
      bedrooms?: number;
      bathrooms?: number;
    };
    media: Array<{
      url: string;
      isCover: boolean;
    }>;
  }>;
  center?: {
    lat: number;
    lng: number;
  };
  zoom?: number;
  height?: string;
  onListingClick?: (listing: any) => void;
  lang?: 'ar' | 'en';
}

export default function AqarMapView({ 
  listings = [], 
  center = { lat: 24.7136, lng: 46.6753 }, // Riyadh center
  zoom = 10,
  height = '500px',
  onListingClick,
  lang = 'ar'
}: AqarMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const t = (ar: string, en: string) => lang === 'ar' ? ar : en;

  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.onload = initializeMap;
      script.onerror = () => {
        console.error('Failed to load Google Maps');
        setIsLoading(false);
      };
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current) return;

      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: center,
        zoom: zoom,
        mapTypeId: 'roadmap',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      setMap(mapInstance);
      setIsLoading(false);
    };

    loadGoogleMaps();

    return () => {
      // Cleanup markers when component unmounts
      markers.forEach(marker => {
        if (marker.setMap) {
          marker.setMap(null);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!map || !listings.length) return;

    // Clear existing markers
    markers.forEach(marker => {
      if (marker.setMap) {
        marker.setMap(null);
      }
    });

    const newMarkers = listings.map(listing => {
      const marker = new window.google.maps.Marker({
        position: {
          lat: listing.location.lat,
          lng: listing.location.lng
        },
        map: map,
        title: listing.title,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#0061A8" stroke="white" stroke-width="2"/>
              <path d="M20 8c-6.627 0-12 5.373-12 12 0 6.627 12 20 12 20s12-13.373 12-20c0-6.627-5.373-12-12-12zm0 16c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20)
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="p-4 max-w-sm" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
            <div class="font-semibold text-lg mb-2">${listing.title}</div>
            <div class="text-[#0061A8] font-bold text-xl mb-2">
              ${listing.price.amount.toLocaleString()} ${listing.price.currency}
            </div>
            <div class="text-sm text-gray-600 mb-2">
              ${listing.location.district}, ${listing.location.city}
            </div>
            <div class="text-sm text-gray-600 mb-3">
              ${listing.specifications.area} م²
              ${listing.specifications.bedrooms ? ` • ${listing.specifications.bedrooms} ${t('غرف', 'BR')}` : ''}
              ${listing.specifications.bathrooms ? ` • ${listing.specifications.bathrooms} ${t('حمام', 'BA')}` : ''}
            </div>
            <button 
              onclick="window.selectListing('${listing._id}')"
              class="w-full px-3 py-2 bg-[#0061A8] text-white text-sm font-medium rounded hover:bg-[#0056a3] transition-colors"
            >
              ${t('عرض التفاصيل', 'View Details')}
            </button>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        setSelectedListing(listing);
      });

      return marker;
    });

    setMarkers(newMarkers);

    // Add global function for info window button
    (window as any).selectListing = (listingId: string) => {
      const listing = listings.find(l => l._id === listingId);
      if (listing && onListingClick) {
        onListingClick(listing);
      }
    };
  }, [map, listings, lang]);

  const handleZoomIn = () => {
    if (map) {
      const currentZoom = map.getZoom();
      map.setZoom(currentZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (map) {
      const currentZoom = map.getZoom();
      map.setZoom(currentZoom - 1);
    }
  };

  const handleCenterMap = () => {
    if (map) {
      map.setCenter(center);
      map.setZoom(zoom);
    }
  };

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 rounded-lg"
        style={{ height }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0061A8] mx-auto mb-4"></div>
          <p className="text-gray-600">{t('جاري تحميل الخريطة...', 'Loading map...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Map Container */}
      <div
        ref={mapRef}
        className="w-full rounded-lg shadow-lg"
        style={{ height }}
      />

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
          title={t('تكبير', 'Zoom In')}
        >
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </button>
        
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
          title={t('تصغير', 'Zoom Out')}
        >
          <ZoomOut className="w-5 h-5 text-gray-700" />
        </button>
        
        <button
          onClick={handleCenterMap}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
          title={t('توسيط الخريطة', 'Center Map')}
        >
          <Navigation className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 bg-[#0061A8] rounded-full"></div>
          <span className="text-sm font-medium text-gray-700">
            {t('عقارات متاحة', 'Available Properties')}
          </span>
        </div>
        <div className="text-xs text-gray-600">
          {t('انقر على العلامة لعرض التفاصيل', 'Click marker to view details')}
        </div>
      </div>

      {/* Selected Listing Info */}
      {selectedListing && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg">{selectedListing.title}</h3>
            <button
              onClick={() => setSelectedListing(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <div className="text-[#0061A8] font-bold text-xl mb-2">
            {selectedListing.price.amount.toLocaleString()} {selectedListing.price.currency}
          </div>
          <div className="text-sm text-gray-600 mb-2">
            {selectedListing.location.district}, {selectedListing.location.city}
          </div>
          <div className="text-sm text-gray-600 mb-3">
            {selectedListing.specifications.area} م²
            {selectedListing.specifications.bedrooms && ` • ${selectedListing.specifications.bedrooms} ${t('غرف', 'BR')}`}
            {selectedListing.specifications.bathrooms && ` • ${selectedListing.specifications.bathrooms} ${t('حمام', 'BA')}`}
          </div>
          <button
            onClick={() => onListingClick?.(selectedListing)}
            className="w-full px-3 py-2 bg-[#0061A8] text-white text-sm font-medium rounded hover:bg-[#0056a3] transition-colors"
          >
            {t('عرض التفاصيل', 'View Details')}
          </button>
        </div>
      )}
    </div>
  );
}