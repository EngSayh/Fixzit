'use client';
/// <reference types="google.maps" />

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader as Spinner } from 'lucide-react';

type LatLng = { lat: number; lng: number };
type MarkerInput = {
  position: LatLng;
  title?: string;
  info?: string;
};

type GoogleMapProps = {
  center: LatLng;
  zoom?: number;
  markers?: MarkerInput[];
  height?: string | number;
  onMapClick?: (lat: number, lng: number) => void;
  mapId?: string;
  libraries?: string[];
  language?: string;
  region?: string;
  fitToMarkers?: boolean;
  gestureHandling?: 'cooperative' | 'greedy' | 'none' | 'auto';
  disableDefaultUI?: boolean;
  onReady?: (map: google.maps.Map) => void;
};

declare global {
  interface Window {
    __gmapsPromise?: Promise<void>;
  }
}

function loadGoogleMapsOnce(opts: {
  apiKey: string;
  language?: string;
  region?: string;
  libraries?: string[];
}) {
  if (typeof window === 'undefined') return Promise.resolve();

  if (window.google?.maps) return Promise.resolve();

  if (!window.__gmapsPromise) {
    const { apiKey, language, region, libraries } = opts;
    const params = new URLSearchParams({
      key: apiKey,
      v: 'weekly',
    });
    if (language) params.set('language', language);
    if (region) params.set('region', region);
    if (libraries && libraries.length) params.set('libraries', libraries.join(','));

    window.__gmapsPromise = new Promise<void>((resolve, reject) => {
      const id = 'gmaps-sdk';
      const existing = document.getElementById(id) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Google Maps script error')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = id;
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google Maps script error'));
      document.head.appendChild(script);
    }).catch((e) => {
      window.__gmapsPromise = undefined;
      throw e;
    });
  }
  return window.__gmapsPromise;
}

function createInfoWindowContent(title?: string, info?: string): HTMLDivElement {
  const contentDiv = document.createElement('div');
  contentDiv.style.padding = '8px';
  contentDiv.style.maxWidth = '280px';

  if (title) {
    const strong = document.createElement('strong');
    strong.textContent = title;
    contentDiv.appendChild(strong);
    contentDiv.appendChild(document.createElement('br'));
  }
  if (info) {
    const span = document.createElement('span');
    span.textContent = info;
    contentDiv.appendChild(span);
  }
  return contentDiv;
}

export default function GoogleMap({
  center,
  zoom = 13,
  markers = [],
  height = 400,
  onMapClick,
  mapId,
  libraries = [],
  language,
  region = 'SA',
  fitToMarkers = true,
  gestureHandling = 'cooperative',
  disableDefaultUI = false,
  onReady,
}: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<google.maps.Marker[]>([]);
  const infoRefs = useRef<google.maps.InfoWindow[]>([]);
  const listenerRefs = useRef<google.maps.MapsEventListener[]>([]);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const onMapClickRef = useRef(onMapClick);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  const apiKey = useMemo(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    return key && !/^(your_|dev-)|^dev-google-maps-api-key$/.test(key) ? key : '';
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!containerRef.current) return;
      if (!apiKey) {
        setError(
          'Google Maps requires a valid API key. Ask your admin to set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and enable billing.',
        );
        setLoading(false);
        return;
      }

      try {
        await loadGoogleMapsOnce({ apiKey, language, region, libraries });
        if (cancelled) return;

        const map = new google.maps.Map(containerRef.current, {
          center,
          zoom,
          mapId,
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeControl: false,
          gestureHandling,
          disableDefaultUI,
        });

        mapRef.current = map;

        if (onMapClickRef.current) {
          clickListenerRef.current = map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (e.latLng && onMapClickRef.current) {
              onMapClickRef.current(e.latLng.lat(), e.latLng.lng());
            }
          });
        }

        setLoading(false);
        onReady?.(map);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[GoogleMap] init error', e);
        setError('Failed to load Google Maps. Check API key, referrer restrictions, and billing status.');
        setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
      infoRefs.current.forEach((iw) => iw.close());
      infoRefs.current = [];
      markerRefs.current.forEach((m) => {
        try {
          // @ts-ignore - google maps types sometimes mark internal listeners
          google.maps.event.clearInstanceListeners(m);
        } catch {
          /* noop */
        }
        m.setMap(null);
      });
      markerRefs.current = [];
      listenerRefs.current.forEach((l) => {
        try {
          google.maps.event.removeListener(l);
        } catch {
          /* noop */
        }
      });
      listenerRefs.current = [];
      if (clickListenerRef.current) {
        try {
          google.maps.event.removeListener(clickListenerRef.current);
        } catch {
          /* noop */
        }
        clickListenerRef.current = null;
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current) mapRef.current.setCenter(center);
  }, [center]);

  useEffect(() => {
    if (mapRef.current) mapRef.current.setZoom(zoom);
  }, [zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    infoRefs.current.forEach((iw) => iw.close());
    infoRefs.current = [];
    listenerRefs.current.forEach((l) => {
      try {
        google.maps.event.removeListener(l);
      } catch {
        /* noop */
      }
    });
    listenerRefs.current = [];
    markerRefs.current.forEach((m) => {
      try {
        google.maps.event.clearInstanceListeners(m);
      } catch {
        /* noop */
      }
      m.setMap(null);
    });
    markerRefs.current = [];

    if (!markers.length) return;

    const bounds = new google.maps.LatLngBounds();
    markers.forEach((m) => {
      const marker = new google.maps.Marker({
        position: m.position,
        map,
        title: m.title,
      });

      if (m.title || m.info) {
        const iw = new google.maps.InfoWindow({ content: createInfoWindowContent(m.title, m.info) });
        const l = marker.addListener('click', () => iw.open(map, marker));
        infoRefs.current.push(iw);
        listenerRefs.current.push(l);
      }

      markerRefs.current.push(marker);
      bounds.extend(m.position as google.maps.LatLngLiteral);
    });

    if (fitToMarkers && markers.length > 1) {
      map.fitBounds(bounds, 40);
    } else if (fitToMarkers && markers.length === 1) {
      map.setCenter(markers[0].position);
    }
  }, [markers, fitToMarkers]);

  const wrapperStyle: React.CSSProperties = {
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (error) {
    return (
      <div
        className="relative flex items-center justify-center bg-gray-100 rounded-lg border-2 border-gray-200"
        style={wrapperStyle}
        data-testid="gmaps-error"
      >
        <div className="text-center p-6 max-w-md">
          <div className="mb-3">
            <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold mb-2">Map Unavailable</p>
          <p className="text-sm text-gray-600 mb-3">{error}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>For Developers:</strong> Set{' '}
              <code className="bg-blue-100 px-1 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>, restrict by HTTP
              referrer to your domains, and enable billing + Maps JavaScript API (and Places if used).
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={wrapperStyle} data-testid="gmaps-wrapper">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10" data-testid="gmaps-loading">
          <div className="text-center">
            <Spinner className="w-8 h-8 animate-spin text-[var(--fixzit-primary)] mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full rounded-lg" data-testid="gmaps-canvas" />
    </div>
  );
}