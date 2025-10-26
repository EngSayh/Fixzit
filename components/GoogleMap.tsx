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

// Helper function to create InfoWindow content safely
function createInfoWindowContent(title?: string, info?: string): HTMLDivElement {
  const contentDiv = document.createElement('div');
  contentDiv.style.padding = '8px';
  
  if (title) {
    const titleElement = document.createElement('strong');
    titleElement.textContent = title;
    contentDiv.appendChild(titleElement);
    contentDiv.appendChild(document.createElement('br'));
  }
  
  if (info) {
    const infoText = document.createElement('span');
    infoText.textContent = info;
    contentDiv.appendChild(infoText);
  }
  
  return contentDiv;
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

  // Initialize map once on mount
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
      
      if (!apiKey || apiKey.includes('your_') || apiKey.includes('dev-') || apiKey === 'dev-google-maps-api-key') {
        console.warn('Google Maps API key is not configured or using dev placeholder');
        setError('Google Maps requires a valid API key. Contact your administrator to configure maps.');
        setLoading(false);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      script.onerror = () => {
        setError('Failed to load Google Maps. Check your API key and billing status.');
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
      
      // Clean up script reference counting
      // Note: We don't remove the script element to avoid breaking other map instances
      // that may still be mounted. The script is shared across all GoogleMap components.
      if (scriptRef.current) {
        scriptRef.current.onload = null;
        scriptRef.current.onerror = null;
        scriptRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Update center when it changes (without re-initializing map)
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(center);
    }
  }, [center]);

  // Update zoom when it changes (without re-initializing map)
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [zoom]);

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

      if (markerData.info || markerData.title) {
        // Use helper function for InfoWindow content
        const contentDiv = createInfoWindowContent(markerData.title, markerData.info);

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
        <div className="text-center p-6 max-w-md">
          <div className="mb-3">
            <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold mb-2">Map Unavailable</p>
          <p className="text-sm text-gray-600 mb-3">{error}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>For Developers:</strong> Configure <code className="bg-blue-100 px-1 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your environment variables or enable billing in Google Cloud Console.
            </p>
          </div>
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
