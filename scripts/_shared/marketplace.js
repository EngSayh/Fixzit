// ESM-safe marketplace utilities for Node.js scripts
// Provides path resolution and seeding helpers without TS/alias dependencies

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "../..");

/**
 * Get project root directory
 */
export function getProjectRoot() {
  return projectRoot;
}

/**
 * Resolve path relative to project root
 */
export function resolvePath(...paths) {
  return resolve(projectRoot, ...paths);
}

/**
 * Read JSON file with error handling
 */
export async function readJsonFile(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read JSON file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Write JSON file with pretty formatting
 */
export async function writeJsonFile(filePath, data) {
  try {
    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
    return true;
  } catch (error) {
    console.error(`Failed to write JSON file ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Generate marketplace data structure
 */
export function generateMarketplaceData() {
  return {
    categories: [
      {
        id: "home-services",
        name: "Home Services",
        description: "Professional home maintenance and repair services",
        icon: "home",
        services: [
          "Plumbing",
          "Electrical",
          "HVAC",
          "Cleaning",
          "Painting",
          "Carpentry",
        ],
      },
      {
        id: "property-management",
        name: "Property Management",
        description: "Complete property management solutions",
        icon: "building",
        services: [
          "Tenant Management",
          "Maintenance Coordination",
          "Rent Collection",
          "Property Inspection",
          "Legal Compliance",
          "Financial Reporting",
        ],
      },
      {
        id: "emergency-services",
        name: "Emergency Services",
        description: "24/7 emergency repair and maintenance",
        icon: "alert",
        services: [
          "Emergency Plumbing",
          "Electrical Emergencies",
          "Lock Services",
          "Water Damage",
          "Fire Damage",
          "Security Issues",
        ],
      },
    ],
    providers: [
      {
        id: "fixzit-premium",
        name: "FixZit Premium Services",
        category: "home-services",
        rating: 4.9,
        verified: true,
        services: ["All Categories"],
        coverage: "UAE Wide",
      },
      {
        id: "quick-fix-pros",
        name: "Quick Fix Professionals",
        category: "emergency-services",
        rating: 4.7,
        verified: true,
        services: ["Emergency Repairs", "Maintenance"],
        coverage: "Dubai & Abu Dhabi",
      },
    ],
    pricing: {
      "home-services": {
        base: 150,
        currency: "AED",
        factors: ["complexity", "urgency", "materials"],
      },
      "property-management": {
        base: 500,
        currency: "AED",
        billing: "monthly",
        factors: ["property-count", "service-level"],
      },
      "emergency-services": {
        base: 300,
        currency: "AED",
        surcharge: 1.5,
        availability: "24/7",
      },
    },
    metadata: {
      version: "1.0.0",
      generated: new Date().toISOString(),
      generator: "marketplace-seeder-v2",
      compatibility: "ESM-native",
    },
  };
}

/**
 * Validate marketplace data structure
 */
export function validateMarketplaceData(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    errors.push("Data must be an object");
    return { valid: false, errors };
  }

  // Check required sections
  const requiredSections = ["categories", "providers", "pricing", "metadata"];
  for (const section of requiredSections) {
    if (!data[section]) {
      errors.push(`Missing required section: ${section}`);
    }
  }

  // Validate categories
  if (Array.isArray(data.categories)) {
    data.categories.forEach((cat, index) => {
      if (!cat.id || !cat.name) {
        errors.push(`Category ${index} missing id or name`);
      }
    });
  }

  // Validate providers
  if (Array.isArray(data.providers)) {
    data.providers.forEach((provider, index) => {
      if (!provider.id || !provider.name || !provider.category) {
        errors.push(`Provider ${index} missing required fields`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Console logger with timestamp
 */
export function log(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  switch (level) {
    case "error":
      console.error(prefix, message, ...args);
      break;
    case "warn":
      console.warn(prefix, message, ...args);
      break;
    case "info":
    default:
      console.log(prefix, message, ...args);
      break;
  }
}

/**
 * Safe async operation with error handling
 */
export async function safeAsync(operation, context = "operation") {
  try {
    const result = await operation();
    log("info", `${context} completed successfully`);
    return { success: true, result };
  } catch (error) {
    log("error", `${context} failed:`, error.message);
    return { success: false, error: error.message };
  }
}

export default {
  getProjectRoot,
  resolvePath,
  readJsonFile,
  writeJsonFile,
  generateMarketplaceData,
  validateMarketplaceData,
  log,
  safeAsync,
};
