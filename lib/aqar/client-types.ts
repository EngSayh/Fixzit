// Client-safe Aqar types (no mongoose imports)

export type SmartHomeLevel = "NONE" | "BASIC" | "ADVANCED";

export type ProptechFeature =
  | "SMART_LOCKS"
  | "ENERGY_MONITORING"
  | "WATER_LEAK_SENSORS"
  | "AIR_QUALITY"
  | "SOLAR"
  | "EV_CHARGER"
  | "SECURITY_AI";

export type ListingPricingInsights = {
  pricePerSqm?: number;
  percentile?: number;
  neighborhoodAvg?: number;
  yoyChangePct?: number;
  projectedAppreciationPct?: number;
  demandScore?: number;
  dynamicRange?: {
    conservative?: number;
    base?: number;
    bullish?: number;
  };
  confidence?: number;
  lastComputedAt?: Date;
};

export type ListingProptech = {
  smartHomeLevel: SmartHomeLevel;
  features: ProptechFeature[];
  iotVendors: string[];
  sensors: string[];
  energyScore?: number;
  waterScore?: number;
  evCharging?: boolean;
  solarReady?: boolean;
};

export type ListingIotFeature = {
  key?: string;
  label?: string;
};
