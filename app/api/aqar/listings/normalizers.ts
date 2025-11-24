import {
  SmartHomeLevel,
  ProptechFeature,
  type IListingProptech,
  type IListingImmersive,
} from "@/models/aqar/Listing";

const SMART_HOME_LEVELS = new Set<string>(Object.values(SmartHomeLevel));
const PROPTECH_FEATURES = new Set<string>(Object.values(ProptechFeature));

const sanitizeStringArray = (value: unknown, limit: number): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
    .slice(0, limit);
};

export function normalizeProptech(
  input: unknown,
): IListingProptech | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }
  const value = input as Record<string, unknown>;
  const smartHomeLevel =
    typeof value.smartHomeLevel === "string" &&
    SMART_HOME_LEVELS.has(value.smartHomeLevel)
      ? (value.smartHomeLevel as SmartHomeLevel)
      : SmartHomeLevel.NONE;
  const featuresRaw = Array.isArray(value.features) ? value.features : [];
  const features = featuresRaw
    .map((item) => (typeof item === "string" ? item : ""))
    .filter((item) => PROPTECH_FEATURES.has(item)) as ProptechFeature[];

  return {
    smartHomeLevel,
    features,
    iotVendors: sanitizeStringArray(value.iotVendors, 5),
    sensors: sanitizeStringArray(value.sensors, 20),
    energyScore:
      typeof value.energyScore === "number" ? value.energyScore : undefined,
    waterScore:
      typeof value.waterScore === "number" ? value.waterScore : undefined,
    evCharging: Boolean(value.evCharging),
    solarReady: Boolean(value.solarReady),
  };
}

export function normalizeImmersive(
  input: unknown,
): IListingImmersive | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }
  const value = input as Record<string, unknown>;
  const vrSource = value.vrTour;
  let vrTour: IListingImmersive["vrTour"];
  if (vrSource && typeof vrSource === "object") {
    const vr = vrSource as Record<string, unknown>;
    if (typeof vr.url === "string" && vr.url.trim().length > 0) {
      vrTour = {
        url: vr.url,
        provider: typeof vr.provider === "string" ? vr.provider : undefined,
        thumbnail: typeof vr.thumbnail === "string" ? vr.thumbnail : undefined,
        spatialAnchors: sanitizeStringArray(vr.spatialAnchors, 6),
        ready: Boolean(vr.ready),
      };
    }
  }

  const arSource = value.arModels;
  let arModels: IListingImmersive["arModels"];
  if (arSource && typeof arSource === "object") {
    const ar = arSource as Record<string, unknown>;
    arModels = {
      ios: typeof ar.ios === "string" ? ar.ios : undefined,
      android: typeof ar.android === "string" ? ar.android : undefined,
      web: typeof ar.web === "string" ? ar.web : undefined,
    };
  }

  const dtSource = value.digitalTwin;
  let digitalTwin: IListingImmersive["digitalTwin"];
  if (dtSource && typeof dtSource === "object") {
    const dt = dtSource as Record<string, unknown>;
    if (typeof dt.url === "string" && dt.url.trim().length > 0) {
      digitalTwin = {
        url: dt.url,
        version: typeof dt.version === "string" ? dt.version : undefined,
      };
    }
  }

  const highlights = sanitizeStringArray(value.highlights, 8);

  if (!vrTour && !arModels && !digitalTwin && highlights.length === 0) {
    return undefined;
  }

  return {
    vrTour,
    arModels,
    digitalTwin,
    highlights,
  };
}
