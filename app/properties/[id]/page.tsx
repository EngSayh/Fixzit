"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, Home, Users, Wrench } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslation } from "@/contexts/TranslationContext";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params?.id?.toString() ?? "";
  const { isRTL } = useTranslation();
  const auto = useAutoTranslator("properties.detail");

  const [property] = useState({
    id: propertyId,
    name: "Al Faisaliah Tower",
    address: "King Fahd Road, Riyadh 12211, Saudi Arabia",
    lat: 24.6892,
    lng: 46.6857,
    type: "Commercial",
    units: 45,
    occupancy: 89,
    openWorkOrders: 7,
  });

  const initializeMap = useCallback(() => {
    if (typeof window !== "undefined" && window.google && window.google.maps) {
      const mapElement = document.getElementById("property-map");
      if (!mapElement) return; // Guard against null

      const map = new window.google.maps.Map(mapElement, {
        center: { lat: property.lat, lng: property.lng },
        zoom: 16,
        mapTypeControl: false,
        fullscreenControl: false,
      });

      new window.google.maps.Marker({
        position: { lat: property.lat, lng: property.lng },
        map,
        title: property.name,
      });
    }
  }, [property.lat, property.lng, property.name]);

  useEffect(() => {
    // Load Google Maps
    if (!window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&callback=initMap`;
      script.async = true;
      window.initMap = initializeMap;
      document.head.appendChild(script);

      // ✅ FIX: Add cleanup function to prevent memory leak
      return () => {
        // Remove the script element
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        // Clean up the global callback
        delete (window as { initMap?: unknown }).initMap;
      };
    } else {
      initializeMap();
    }
  }, [initializeMap]);

  return (
    <div className={`min-h-screen bg-muted ${isRTL ? "rtl" : "ltr"}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-card rounded-2xl shadow">
          {/* Header */}
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-foreground">
              {property.name}
            </h1>
            <p
              className={`text-muted-foreground flex items-center gap-2 mt-2 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <MapPin className="h-4 w-4" />
              {property.address}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 border-b">
            <div
              className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Home className="h-6 w-6 text-primary" />
              </div>
              <div className="text-start">
                <p className="text-sm text-muted-foreground">
                  {auto("Type", "stats.type")}
                </p>
                <p className="font-semibold">{property.type}</p>
              </div>
            </div>

            <div
              className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <div className="p-3 bg-success/10 rounded-2xl">
                <Home className="h-6 w-6 text-success" />
              </div>
              <div className="text-start">
                <p className="text-sm text-muted-foreground">
                  {auto("Units", "stats.units")}
                </p>
                <p className="font-semibold">{property.units}</p>
              </div>
            </div>

            <div
              className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <div className="p-3 bg-accent/10 rounded-2xl">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div className="text-start">
                <p className="text-sm text-muted-foreground">
                  {auto("Occupancy", "stats.occupancy")}
                </p>
                <p className="font-semibold">{property.occupancy}%</p>
              </div>
            </div>

            <div
              className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <div className="p-3 bg-destructive/10 rounded-2xl">
                <Wrench className="h-6 w-6 text-destructive" />
              </div>
              <div className="text-start">
                <p className="text-sm text-muted-foreground">
                  {auto("Open Work Orders", "stats.workOrders")}
                </p>
                <p className="font-semibold">{property.openWorkOrders}</p>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">
              {auto("Location", "map.title")}
            </h2>
            <div
              id="property-map"
              className="w-full h-96 rounded-2xl border"
              style={{ minHeight: "400px" }}
            />
          </div>

          {/* Actions */}
          <div
            className={`p-6 border-t bg-muted flex gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <button className="px-4 py-2 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-colors">
              {auto("View Units", "actions.viewUnits")}
            </button>
            <button className="px-4 py-2 bg-success text-white rounded-2xl hover:bg-success-dark transition-colors">
              {auto("Create Work Order", "actions.createWorkOrder")}
            </button>
            <button className="px-4 py-2 border border-border rounded-2xl hover:bg-muted transition-colors">
              {auto("View Reports", "actions.viewReports")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
