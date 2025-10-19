'use client';

import { useMemo, useState } from 'react';
import GoogleMap from '@/components/GoogleMap';

const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 };
const DEFAULT_ZOOM = 11;
const CLICK_BBOX_DELTA = 0.05;

interface Cluster {
  lat: number;
  lng: number;
  count: number;
  avgPrice?: number;
}

export default function MapPage() {
  const center = useMemo(() => DEFAULT_CENTER, []);
  const [markers, setMarkers] = useState<{ position: { lat: number; lng: number }; title?: string; info?: string }[]>([]);

  async function loadClusters(b: { n: number; s: number; e: number; w: number; z: number }) {
    const url = `/api/aqar/map?n=${b.n}&s=${b.s}&e=${b.e}&w=${b.w}&z=${b.z}`;
    const res = await fetch(url);
    const data = await res.json();
    const clusters = Array.isArray(data?.clusters) ? data.clusters : [];
    setMarkers(
      clusters.map((c: Cluster) => ({
        position: { lat: c.lat, lng: c.lng },
        title: String(c.count),
        info: `Avg SAR ${c.avgPrice?.toLocaleString ? c.avgPrice.toLocaleString() : (typeof c.avgPrice === 'number' ? c.avgPrice.toString() : '-')}`,
      }))
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interactive Property Map</h1>
          <p className="text-gray-600">Explore properties on the map</p>
        </div>
      </div>

      <div className="flex-1">
        <GoogleMap
          center={center}
          zoom={DEFAULT_ZOOM}
          height="100%"
          markers={markers}
          onMapClick={(lat, lng) => {
            const b = { n: lat + CLICK_BBOX_DELTA, s: lat - CLICK_BBOX_DELTA, e: lng + CLICK_BBOX_DELTA, w: lng - CLICK_BBOX_DELTA, z: DEFAULT_ZOOM };
            void loadClusters(b);
          }}
        />
      </div>
    </div>
  );
}


