'use client';

import { useCallback, useEffect, useState } from 'react';
import { MapPin, Home, Users, Wrench } from 'lucide-react';
import { useParams } from 'next/navigation';

// Google Maps type declaration
declare global {
  interface Window {
    google: any;
  }
}

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params.id;
  
  const [property, _setProperty] = useState({
    id: propertyId,
    name: 'Al Faisaliah Tower',
    address: 'King Fahd Road, Riyadh 12211, Saudi Arabia',
    lat: 24.6892,
    lng: 46.6857,
    type: 'Commercial',
    units: 45,
    occupancy: 89,
    openWorkOrders: 7
  });
  
  const initializeMap = useCallback(() => {
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      const map = new window.google.maps.Map(document.getElementById('property-map'), {
        center: { lat: property.lat, lng: property.lng },
        zoom: 16,
        mapTypeControl: false,
        fullscreenControl: false
      });
      
      new window.google.maps.Marker({
        position: { lat: property.lat, lng: property.lng },
        map,
        title: property.name
      });
    }
  }, [property.lat, property.lng, property.name]);

  useEffect(() => {
    // Load Google Maps
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&callback=initMap`;
      script.async = true;
      window.initMap = initializeMap;
      document.head.appendChild(script);
    } else {
      initializeMap();
    }
  }, [initializeMap]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
            <p className="text-gray-600 flex items-center gap-2 mt-2">
              <MapPin className="h-4 w-4" />
              {property.address}
            </p>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-fixzit-blue/10 rounded-lg">
                <Home className="h-6 w-6 text-fixzit-blue" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="font-semibold">{property.type}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-fixzit-green/10 rounded-lg">
                <Home className="h-6 w-6 text-fixzit-green" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Units</p>
                <p className="font-semibold">{property.units}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-fixzit-yellow/10 rounded-lg">
                <Users className="h-6 w-6 text-fixzit-yellow" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Occupancy</p>
                <p className="font-semibold">{property.occupancy}%</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <Wrench className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Open Work Orders</p>
                <p className="font-semibold">{property.openWorkOrders}</p>
              </div>
            </div>
          </div>
          
          {/* Map */}
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Location</h2>
            <div 
              id="property-map" 
              className="w-full h-96 rounded-lg border"
              style={{ minHeight: '400px' }}
            />
          </div>
          
          {/* Actions */}
          <div className="p-6 border-t bg-gray-50 flex gap-3">
            <button className="px-4 py-2 bg-fixzit-blue text-white rounded-lg hover:bg-fixzit-blue/90">
              View Units
            </button>
            <button className="px-4 py-2 bg-fixzit-green text-white rounded-lg hover:bg-fixzit-green/90">
              Create Work Order
            </button>
            <button className="px-4 py-2 border rounded-lg hover:bg-gray-100">
              View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
