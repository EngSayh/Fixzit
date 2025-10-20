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

// Simple, reliable Google Maps implementation
export default function GoogleMap({ 
  center, 
  zoom = 13, 
  markers = [], 
  height = '400px',
  onMapClick
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep callback ref in sync
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

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

        // Add click listener using ref to avoid stale closures
        if (onMapClickRef.current) {
          const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (e.latLng && onMapClickRef.current) {
              onMapClickRef.current(e.latLng.lat(), e.latLng.lng());
            }
          });
          mapClickListenerRef.current = clickListener;
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
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.error('Google Maps API key not found in environment variables');
        setError('Map configuration error');
        setLoading(false);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      script.onerror = () => {
        setError('Failed to load Google Maps. Please check your internet connection.');
        setLoading(false);
      };
      document.head.appendChild(script);
      scriptRef.current = script;
    } else {
      initMap();
    }

    return () => {
      // Close all InfoWindows
      infoWindowsRef.current.forEach(iw => iw.close());
      infoWindowsRef.current = [];
      
      // Remove all event listeners
      listenersRef.current.forEach(listener => {
        google.maps.event.removeListener(listener);
      });
      listenersRef.current = [];
      
      // Remove map click listener
      if (mapClickListenerRef.current) {
        google.maps.event.removeListener(mapClickListenerRef.current);
        mapClickListenerRef.current = null;
      }
      
      // Clear markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      
      // Clean up script if we created it
      if (scriptRef.current) {
        scriptRef.current.onload = null;
        scriptRef.current.onerror = null;
        if (document.head.contains(scriptRef.current)) {
          document.head.removeChild(scriptRef.current);
        }
        scriptRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, zoom]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers and cleanup
    infoWindowsRef.current.forEach(iw => iw.close());
    infoWindowsRef.current = [];
    listenersRef.current.forEach(listener => google.maps.event.removeListener(listener));
    listenersRef.current = [];
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
        // Create safe DOM elements to prevent XSS
        const contentDiv = document.createElement('div');
        contentDiv.style.padding = '8px';
        
        if (markerData.title) {
          const titleElement = document.createElement('strong');
          titleElement.textContent = markerData.title;
          contentDiv.appendChild(titleElement);
          contentDiv.appendChild(document.createElement('br'));
        }
        
        const infoText = document.createElement('span');
        infoText.textContent = markerData.info;
        contentDiv.appendChild(infoText);

        const infoWindow = new google.maps.InfoWindow({
          content: contentDiv
        });

        const clickListener = marker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });
        
        // Store for cleanup
        infoWindowsRef.current.push(infoWindow);
        listenersRef.current.push(clickListener);
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
