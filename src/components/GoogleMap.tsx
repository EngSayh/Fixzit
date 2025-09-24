// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from 'lucide-react';

interface GoogleMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    position: { lat: number; lng: number };
    title?: string;
    info?: string;
  }>;
  height?: string;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function GoogleMap({ 
  center, 
  zoom = 13, 
  markers = [], 
  height = '400px',
  onMapClick 
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    // Load Google Maps script
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    } else {
      initializeMap();
    }

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (map) {
      map.setCenter(center);
    }
  }, [center, map]);

  useEffect(() => {
    if (map) {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Add new markers
      markers.forEach(markerData => {
        const marker = new google.maps.Marker({
          position: markerData.position,
          map: map,
          title: markerData.title,
          animation: google.maps.Animation.DROP
        });

        if (markerData.info) {
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div class="p-2">
                <h3 class="font-semibold">${markerData.title || ''}</h3>
                <p class="text-sm text-gray-600">${markerData.info}</p>
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });
        }

        markersRef.current.push(marker);
      });
    }
  }, [markers, map]);

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return;

    const mapInstance = new google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    if (onMapClick) {
      mapInstance.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          onMapClick(event.latLng.lat(), event.latLng.lng());
        }
      });
    }

    setMap(mapInstance);
    setLoading(false);
  };

  return (
    <div className="relative" style={{ height }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  );
}
