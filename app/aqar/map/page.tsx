"use client";

import React, { useEffect, useMemo, useState } from 'react';
import GoogleMap from '@/src/components/GoogleMap';

export default function MapPage() {
  const [bounds, setBounds] = useState<{n:number;s:number;e:number;w:number;z:number}|null>(null);
  const [clusters, setClusters] = useState<any[]>([]);

  const center = useMemo(() => ({ lat: 24.7136, lng: 46.6753 }), []);

  useEffect(() => {
    const load = async () => {
      if (!bounds) return;
      const { n, s, e, w, z } = bounds;
      const res = await fetch(`/api/aqar/map?n=${n}&s=${s}&e=${e}&w=${w}&z=${z}`);
      const data = await res.json();
      setClusters(data.clusters || []);
    };
    load();
  }, [bounds]);

  // We emulate bounds updates by polling map center via GoogleMap click callback; alternatively, extend GoogleMap to emit bounds
  const markers = clusters.map((c:any) => ({ position: { lat: c.lat, lng: c.lng }, title: String(c.count), info: `Avg SAR ${c.avgPrice?.toLocaleString?.()||'-'}` }));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Interactive Property Map</h1>
      <GoogleMap
        center={center}
        zoom={11}
        markers={markers}
        height="70vh"
        onMapClick={(lat, lng) => {
          // Roughly construct a bbox around click; in production, modify GoogleMap to emit actual bounds
          const delta = 0.05;
          setBounds({ n: lat + delta, s: lat - delta, e: lng + delta, w: lng - delta, z: 11 });
        }}
      />
    </div>
  );
}

