'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { config } from '@/src/config/environment';

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    position: { lat: number; lng: number };
    title?: string;
    info?: string;
  }>;
  height?: string;
  width?: string;
  className?: string;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function GoogleMap({
  center = { lat: 24.7136, lng: 46.6753 }, // Default to Riyadh
  zoom = 12,
  markers = [],
  height = '400px',
  width = '100%',
  className = '',
  onMapClick
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  useEffect(() => {
    if (!config.googleMaps.apiKey) {
      setError('Google Maps API key not configured');
      return;
    }

    const loader = new Loader({
      apiKey: config.googleMaps.apiKey,
      version: 'weekly',
      libraries: ['places']
    });

    loader
      .load()
      .then(() => {
        if (!mapRef.current) return;

        // Initialize map
        const googleMap = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi.business',
              stylers: [{ visibility: 'on' }]
            }
          ]
        });

        // Create info window
        infoWindowRef.current = new google.maps.InfoWindow();

        // Add click listener
        if (onMapClick) {
          googleMap.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
              onMapClick(e.latLng.lat(), e.latLng.lng());
            }
          });
        }

        setMap(googleMap);
      })
      .catch((err) => {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load Google Maps');
      });

    // Cleanup
    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, []);

  // Update markers when map or markers prop changes
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    markers.forEach((markerData) => {
      const marker = new google.maps.Marker({
        position: markerData.position,
        map,
        title: markerData.title,
        animation: google.maps.Animation.DROP
      });

      // Add info window if info is provided
      if (markerData.info && infoWindowRef.current) {
        marker.addListener('click', () => {
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(`
              <div style="padding: 10px;">
                <h3 style="margin: 0 0 5px 0; color: #0061A8;">${markerData.title || 'Location'}</h3>
                <p style="margin: 0; color: #666;">${markerData.info}</p>
              </div>
            `);
            infoWindowRef.current.open(map, marker);
          }
        });
      }

      markersRef.current.push(marker);
    });

    // Fit bounds if multiple markers
    if (markers.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(markerData => {
        bounds.extend(markerData.position);
      });
      map.fitBounds(bounds);
    } else if (markers.length === 1) {
      map.setCenter(markers[0].position);
      map.setZoom(zoom);
    }
  }, [map, markers, zoom]);

  // Update center when it changes
  useEffect(() => {
    if (map && center) {
      map.setCenter(center);
    }
  }, [map, center]);

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 border border-gray-300 rounded-lg ${className}`}
        style={{ height, width }}
      >
        <div className="text-center p-4">
          <div className="text-gray-500 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      className={`rounded-lg overflow-hidden ${className}`}
      style={{ height, width }}
    />
  );
}

// Property Map Component
export function PropertyMap({ properties }: { properties: any[] }) {
  const markers = properties
    .filter(p => p.address?.coordinates)
    .map(property => ({
      position: {
        lat: property.address.coordinates.lat,
        lng: property.address.coordinates.lng
      },
      title: property.name,
      info: `
        <div>
          <p><strong>Type:</strong> ${property.type}</p>
          <p><strong>Units:</strong> ${property.totalUnits}</p>
          <p><strong>Address:</strong> ${property.address.street}, ${property.address.city}</p>
        </div>
      `
    }));

  return (
    <GoogleMap
      markers={markers}
      height="500px"
      className="shadow-lg"
    />
  );
}