'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const initializeMap = useCallback(() => {
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

    // Store click listener reference for cleanup
    if (onMapClick) {
      clickListenerRef.current = mapInstance.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          onMapClick(event.latLng.lat(), event.latLng.lng());
        }
      });
    }

    setMap(mapInstance);
    setLoading(false);
  }, [center, zoom, onMapClick]);

  useEffect(() => {
    // Load Google Maps script
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => {
        setError('Failed to load Google Maps. Please check your API key and internet connection.');
        setLoading(false);
      };
      document.head.appendChild(script);
    } else {
      initializeMap();
    }

    return () => {
      // Cleanup click listener
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
      
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      
      // Cleanup map instance to prevent memory leaks
      if (map) {
        google.maps.event.clearInstanceListeners(map);
      }
    };
  }, [initializeMap, map]);

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
          // Create InfoWindow content using DOM nodes to prevent XSS
          const contentDiv = document.createElement('div');
          contentDiv.className = 'p-2';
          
          if (markerData.title) {
            const titleElement = document.createElement('h3');
            titleElement.className = 'font-semibold';
            titleElement.textContent = markerData.title;
            contentDiv.appendChild(titleElement);
          }
          
          const infoElement = document.createElement('p');
          infoElement.className = 'text-sm text-gray-600';
          infoElement.textContent = markerData.info;
          contentDiv.appendChild(infoElement);
          
          const infoWindow = new google.maps.InfoWindow({
            content: contentDiv
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });
        }

        markersRef.current.push(marker);
      });
    }
  }, [markers, map]);

  return (
    <div className="relative" style={{ height }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <Loader className="w-8 h-8 animate-spin text-[var(--fixzit-primary)]" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-lg" role="alert">
          <div className="text-center p-4">
            <p className="text-red-600 font-semibold mb-2">Map Loading Error</p>
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-lg" aria-label="Google Map" />
    </div>
  );
}

