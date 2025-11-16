/**
 * Apartment Search Module for Fixzit AI Assistant
 * Provides guest-safe property/unit search with RBAC enforcement
 * Integrates with Aqar marketplace and Property Management modules
 */

import { Property } from "@/server/models/Property";
import { db } from "@/lib/mongo";
import type { SessionContext } from "@/src/types/copilot";
import { extractApartmentSearchParams } from "./classifier";
import { logger } from "@/lib/logger";

/**
 * Guest-safe apartment search result
 * Redacts sensitive information (unitId, agent contact) for unauthenticated users
 */
export interface ApartmentSearchResult {
  unitId?: string; // Only for authenticated users
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  area: number; // sqm
  rent: number;
  currency: string;
  city?: string;
  district?: string;
  available: boolean;
  furnished?: boolean;
  agentName?: string; // Only for authenticated users
  agentContact?: string; // Only for authenticated users
  mapLink?: string;
  features?: string[];
  availableFrom?: string;
}

/**
 * Searches for available units based on user query and permissions
 * 
 * @param query - Natural language search query
 * @param context - Session context with role/orgId for filtering
 * @returns Array of available units (guest-safe)
 */
export async function searchAvailableUnits(
  query: string,
  context: SessionContext
): Promise<ApartmentSearchResult[]> {
  await db;

  try {
    // Extract search parameters from natural language query
    const params = extractApartmentSearchParams(query, context.locale);

    // Build MongoDB filter
    const filter: Record<string, unknown> = {
      isDeleted: { $ne: true },
      status: { $in: ["VACANT", "ACTIVE"] },
    };

    // Multi-tenancy: guests see public listings, authenticated users see org listings
    if (!context.orgId) {
      // Guest: public listings only (advertisement active)
      filter["ownerPortal.currentAdvertisementId"] = { $exists: true, $ne: null };
      filter["ownerPortal.advertisementExpiry"] = { $gte: new Date() };
    } else {
      // Authenticated: show org properties + public listings
      filter.$or = [
        { orgId: context.orgId },
        {
          "ownerPortal.currentAdvertisementId": { $exists: true, $ne: null },
          "ownerPortal.advertisementExpiry": { $gte: new Date() },
        },
      ];
    }

    // Apply search parameters
    if (params.city) {
      filter["address.city"] = new RegExp(params.city, "i");
    }

    if (params.bedrooms !== undefined) {
      filter["details.bedrooms"] = params.bedrooms;
    }

    if (params.priceRange) {
      const rentFilter: Record<string, unknown> = {};
      if (params.priceRange.min) rentFilter.$gte = params.priceRange.min;
      if (params.priceRange.max) rentFilter.$lte = params.priceRange.max;
      filter["financial.monthlyRent"] = rentFilter;
    }

    // Query properties with populated units
    const properties = await Property.find(filter)
      .select(
        "name address details financial units ownerPortal agentId status"
      )
      .limit(10) // Limit results to prevent performance issues
      .lean()
      .exec();

    if (!properties || properties.length === 0) {
      logger.info("[apartmentSearch] No properties found", { filter, params });
      return [];
    }

    // Transform to guest-safe results
    const results: ApartmentSearchResult[] = [];

    for (const property of properties) {
      // Handle properties with embedded units (if schema has units array)
      const units = (property as unknown as { units?: unknown[] }).units || [];

      if (units.length > 0) {
        // Property has embedded units
        for (const unit of units) {
          const unitData = unit as Record<string, unknown>;
          
          // Skip occupied units
          if (unitData.status !== "VACANT" && unitData.status !== "AVAILABLE") continue;

          // Apply furnished filter
          if (params.furnished !== undefined) {
            if (unitData.furnished !== params.furnished) continue;
          }

          results.push({
            unitId: context.userId ? String(unitData._id) : undefined,
            propertyId: String(property._id),
            propertyName: String(property.name),
            propertyAddress: formatAddress(property),
            unitNumber: String(unitData.number || "N/A"),
            bedrooms: Number(unitData.bedrooms || property.details?.bedrooms || 0),
            bathrooms: Number(unitData.bathrooms || property.details?.bathrooms || 0),
            area: Number(unitData.area || property.details?.totalArea || 0),
            rent: Number(unitData.rent || property.financial?.monthlyRent || 0),
            currency: "SAR",
            city: property.address?.city || undefined,
            district: property.address?.district || undefined,
            available: true,
            furnished: Boolean(unitData.furnished),
            agentName: context.userId ? getAgentName(property) : undefined,
            agentContact: context.userId ? getAgentContact(property) : undefined,
            mapLink: generateMapLink(property),
            features: extractFeatures(unitData),
            availableFrom: unitData.availableDate ? new Date(unitData.availableDate as Date).toISOString().split('T')[0] : undefined,
          });
        }
      } else {
        // Property is a single unit (no embedded units)
        const propData = property as Record<string, unknown>;
        results.push({
          propertyId: String(property._id),
          propertyName: String(property.name),
          propertyAddress: formatAddress(property),
          unitNumber: "1", // Single unit property
          bedrooms: Number(property.details?.bedrooms || 0),
          bathrooms: Number(property.details?.bathrooms || 0),
          area: Number(property.details?.totalArea || 0),
          rent: Number(property.financial?.monthlyRent || 0),
          currency: "SAR",
          city: property.address?.city || undefined,
          district: property.address?.district || undefined,
          available: propData.status === "VACANT" || propData.status === "ACTIVE",
          agentName: context.userId ? getAgentName(property) : undefined,
          agentContact: context.userId ? getAgentContact(property) : undefined,
          mapLink: generateMapLink(property),
          features: extractPropertyFeatures(property.details),
        });
      }
    }

    logger.info("[apartmentSearch] Found results", {
      query,
      params,
      count: results.length,
      role: context.role,
    });

    return results;
  } catch (error) {
    logger.error("[apartmentSearch] Search failed", { error, query, context });
    return [];
  }
}

/**
 * Formats property address for display
 */
function formatAddress(property: unknown): string {
  const prop = property as Record<string, unknown>;
  const address = prop.address as Record<string, unknown> | undefined;

  if (!address) return "N/A";

  const parts = [
    address.street,
    address.district,
    address.city,
    address.region,
  ].filter(Boolean);

  return parts.join(", ");
}

/**
 * Gets agent name from property (authenticated users only)
 */
function getAgentName(property: unknown): string | undefined {
  const prop = property as Record<string, unknown>;
  const ownerPortal = prop.ownerPortal as Record<string, unknown> | undefined;

  if (ownerPortal?.agentId) {
    // In real implementation, would populate agent user details
    return "Assigned Agent"; // Placeholder
  }

  return undefined;
}

/**
 * Gets agent contact from property (authenticated users only)
 */
function getAgentContact(property: unknown): string | undefined {
  const prop = property as Record<string, unknown>;
  const ownerPortal = prop.ownerPortal as Record<string, unknown> | undefined;

  if (ownerPortal?.agentId) {
    // In real implementation, would populate agent contact
    return undefined; // Redacted for privacy
  }

  return undefined;
}

/**
 * Generates map link for property location
 */
function generateMapLink(property: unknown): string {
  const prop = property as Record<string, unknown>;
  const address = prop.address as Record<string, unknown> | undefined;
  const coordinates = address?.coordinates as Record<string, number> | undefined;

  if (coordinates?.lat && coordinates?.lng) {
    // Internal map view (frontend route)
    return `/properties/${prop._id}/map`;
  }

  // Fallback to city search
  if (address?.city) {
    return `/map?city=${encodeURIComponent(String(address.city))}`;
  }

  return `/map`;
}

/**
 * Extracts unit features for display
 */
function extractFeatures(unit: Record<string, unknown>): string[] {
  const features: string[] = [];

  if (unit.furnished) features.push("Furnished");
  if (unit.parking) features.push("Parking");
  if (unit.balcony) features.push("Balcony");
  if (unit.elevator) features.push("Elevator");
  if (unit.ac) features.push("Air Conditioning");
  if (unit.kitchen) features.push("Kitchen");

  return features;
}

/**
 * Extracts property-level features
 */
function extractPropertyFeatures(details: unknown): string[] {
  const det = details as Record<string, unknown> | undefined;
  if (!det) return [];

  const features: string[] = [];

  if (det.parkingSpaces && Number(det.parkingSpaces) > 0) {
    features.push(`${det.parkingSpaces} Parking Spaces`);
  }
  if (det.floors && Number(det.floors) > 1) {
    features.push(`${det.floors} Floors`);
  }
  if (det.yearBuilt) {
    features.push(`Built ${det.yearBuilt}`);
  }

  return features;
}

/**
 * Formats search results for AI assistant display (localized)
 */
export function formatApartmentResults(
  results: ApartmentSearchResult[],
  locale: 'en' | 'ar'
): string {
  if (results.length === 0) {
    return locale === 'ar'
      ? 'لا توجد وحدات متاحة مطابقة للمعايير التي ذكرتها. يمكنني مساعدتك في البحث بمعايير مختلفة.'
      : 'No available units match your criteria. I can help you search with different parameters.';
  }

  const intro = locale === 'ar'
    ? `وجدت ${results.length} وحدة متاحة:`
    : `Found ${results.length} available unit${results.length > 1 ? 's' : ''}:`;

  const lines = results.map((r, idx) => {
    if (locale === 'ar') {
      return [
        `${idx + 1}. **${r.propertyName}** - وحدة ${r.unitNumber}`,
        `   📍 ${r.city || r.propertyAddress}`,
        `   🛏️ ${r.bedrooms} غرف نوم، ${r.bathrooms} حمام، ${r.area} م²`,
        `   💰 ${r.rent.toLocaleString('ar-SA')} ريال/شهر`,
        r.features && r.features.length > 0 ? `   ✨ ${r.features.join(', ')}` : '',
        r.agentName ? `   👤 ${r.agentName}` : '',
      ].filter(Boolean).join('\n');
    } else {
      return [
        `${idx + 1}. **${r.propertyName}** - Unit ${r.unitNumber}`,
        `   📍 ${r.city || r.propertyAddress}`,
        `   🛏️ ${r.bedrooms} bed, ${r.bathrooms} bath, ${r.area} sqm`,
        `   💰 SAR ${r.rent.toLocaleString('en-US')}/mo`,
        r.features && r.features.length > 0 ? `   ✨ ${r.features.join(', ')}` : '',
        r.agentName ? `   👤 ${r.agentName}` : '',
      ].filter(Boolean).join('\n');
    }
  });

  const footer = locale === 'ar'
    ? '\n\nيمكنني تزويدك بمزيد من التفاصيل عن أي وحدة، أو مساعدتك في جدولة زيارة.'
    : '\n\nI can provide more details on any unit or help you schedule a visit.';

  return `${intro}\n\n${lines.join('\n\n')}${footer}`;
}
