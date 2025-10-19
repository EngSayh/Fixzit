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
  mapId?: string;
}

// Simple, reliable Google Maps implementation
export default function GoogleMap({ 
  center, 
  zoom = 13, 
  markers = [], 
  height = '400px',
  onMapClick,
  mapId: _mapId
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current) return;

      try {
        // Create map
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        mapInstanceRef.current = map;

        // Add click listener
        if (onMapClick) {
          map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
              onMapClick(e.latLng.lat(), e.latLng.lng());
            }
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize map:', err);
        setError('Failed to load map');
        setLoading(false);
      }
    };

    // Load Google Maps script
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAhsOJLVQDcpyGoGayMjt0L_y9i7ffWRfU`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      script.onerror = () => {
        setError('Failed to load Google Maps. Please check your internet connection.');
        setLoading(false);
      };
      document.head.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      // Cleanup
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, zoom]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    markers.forEach(markerData => {
      const marker = new google.maps.Marker({
        position: markerData.position,
        map: mapInstanceRef.current,
        title: markerData.title,
      });

      if (markerData.info) {
        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="padding:8px"><strong>${markerData.title || ''}</strong><br/>${markerData.info}</div>`
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });
      }

      markersRef.current.push(marker);
    });
  }, [markers]);

  if (error) {
    return (
      <div className="relative flex items-center justify-center bg-gray-100 rounded-lg border-2 border-gray-200" style={{ height }}>
        <div className="text-center p-4">
          <p className="text-gray-600 font-medium mb-2">Map Unavailable</p>
          <p className="text-sm text-gray-500">{error}</p>
          <p className="text-xs text-gray-400 mt-2">Enable billing in Google Cloud Console to use maps</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-[var(--fixzit-primary)] mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  );
}

