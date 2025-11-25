"use client";

import { useState } from "react";

type VRTourProps = {
  url: string;
  title?: string;
};

export function VRTour({ url, title = "Virtual Tour" }: VRTourProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-black/5">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card">
        <div className="font-semibold text-foreground">{title}</div>
        {!isLoaded && (
          <span className="text-xs text-muted-foreground">Loading...</span>
        )}
      </div>
      <iframe
        src={url}
        title={title}
        className="w-full h-[420px] bg-black"
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope"
      />
    </div>
  );
}

export default VRTour;
