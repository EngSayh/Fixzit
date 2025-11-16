import fs from 'fs';
import { logger } from '@/lib/logger';
import path from 'path';
import { MarketplaceProduct } from '@/server/models/marketplace/Product';
import { Types } from 'mongoose';
import Product from '@/server/models/marketplace/Product';
import { db } from '@/lib/mongo';
import { serializeProduct } from './serializers';

/**
 * Synonym Map Structure
 * 
 * Defines brand and product term synonyms for search query expansion.
 * Used to match user queries with product catalog variations.
 * 
 * @example
 * {
 *   brand: { "samsung": ["samsung electronics", "samsung co"] },
 *   product: { "ac": ["air conditioner", "cooling unit"] }
 * }
 */
interface SynonymMap {
  brand: Record<string, string[]>;      // Brand name variations
  product: Record<string, string[]>;    // Product term alternatives
}

/** In-memory cache for synonym data to avoid repeated file reads */
let cachedSynonyms: SynonymMap | undefined;

/**
 * Load Search Synonyms from Filesystem
 * 
 * Reads and caches synonym mappings from search/synonyms.json.
 * Falls back to empty maps if file is missing or invalid.
 * 
 * Caching ensures we only read the file once per process lifetime,
 * improving search performance.
 * 
 * @returns Synonym mappings for brands and products
 */
function loadSynonyms(): SynonymMap {
  if (cachedSynonyms) return cachedSynonyms;
  const filePath = path.join(process.cwd(), 'search', 'synonyms.json');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    cachedSynonyms = JSON.parse(content);
    return cachedSynonyms!;
  } catch (error) {
    logger.warn('Marketplace search synonyms unavailable, using defaults', { error });
    cachedSynonyms = { brand: {}, product: {} };
    return cachedSynonyms!;
  }
}

/**
 * Expand Search Query with Synonyms
 * 
 * Takes user query and adds synonym variations to improve search recall.
 * For example, "AC repair" becomes "AC air conditioner cooling unit repair".
 * 
 * Process:
 * 1. Tokenize query into words
 * 2. For each token, find matching synonyms
 * 3. Add all variations to expanded set
 * 4. Return combined query string
 * 
 * @param value - User's search query
 * @returns Expanded query with synonyms included
 * 
 * @example
 * expandQuery('samsung ac') 
 * // Returns: 'samsung samsung electronics ac air conditioner cooling unit'
 */
function expandQuery(value: string) {
  const synonyms = loadSynonyms();
  const tokens = value.split(/\s+/).filter(Boolean);
  const expanded = new Set<string>(tokens);

  for (const token of tokens) {
    for (const dictionary of [synonyms.brand, synonyms.product]) {
      for (const [key, variants] of Object.entries(dictionary)) {
        if (token.localeCompare(key, undefined, { sensitivity: 'base' }) === 0 || variants.includes(token)) {
          expanded.add(key);
          variants.forEach(variant => expanded.add(variant));
        }
      }
    }
  }

  return Array.from(expanded).join(' ');
}

export interface MarketplaceSearchFilters {
  orgId: Types.ObjectId;
  q?: string;
  categoryId?: Types.ObjectId;
  brand?: string;
  standard?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  skip?: number;
}

type MongoQueryOperator = 
  | { $gte?: number; $lte?: number }
  | { $text: { $search: string; $language?: string } }
  | { $regex: RegExp; $options?: string }
  | { $in: (string | number | Types.ObjectId)[] }
  | { $nin: (string | number | Types.ObjectId)[] }
  | { $exists: boolean }
  | Types.ObjectId
  | string
  | number
  | boolean
  | MongoQueryOperator[];
type MongoQuery = Record<string, MongoQueryOperator | MongoQueryOperator[] | Record<string, MongoQueryOperator>>;

export async function searchProducts(filters: MarketplaceSearchFilters) {
  await db;
  const query: MongoQuery = { orgId: filters.orgId, status: 'ACTIVE' };

  if (filters.q) {
    query.$text = { $search: expandQuery(filters.q) };
  }

  if (filters.categoryId) {
    query.categoryId = filters.categoryId;
  }

  if (filters.brand) {
    query.brand = filters.brand;
  }

  if (filters.standard) {
    query.standards = filters.standard;
  }

  if (filters.minPrice != null || filters.maxPrice != null) {
    const priceQuery: { $gte?: number; $lte?: number } = {};
    if (filters.minPrice != null) {
      priceQuery.$gte = filters.minPrice;
    }
    if (filters.maxPrice != null) {
      priceQuery.$lte = filters.maxPrice;
    }
    query['buy.price'] = priceQuery;
  }

  const limit = Math.min(Math.max(filters.limit ?? 24, 1), 100);
  const skip = Math.max(filters.skip ?? 0, 0);

  const [items, total, distinctBrands, distinctStandards] = await Promise.all([
    Product.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
    Product.countDocuments(query),
    Product.distinct('brand', query),
    Product.distinct('standards', query)
  ]);

  const categoriesAggregation = await Product.aggregate([
    { $match: query },
    { $group: { _id: '$categoryId', count: { $sum: 1 } } }
  ]);

  const categoryIds = categoriesAggregation.map((item: any) => item._id as Types.ObjectId);

  return {
    items: items.map((item: any) => serializeProduct(item as MarketplaceProduct)),
    pagination: {
      total,
      limit,
      skip
    },
    facets: {
      brands: distinctBrands.filter(Boolean).sort(),
      standards: distinctStandards.flat().filter(Boolean).sort(),
      categories: categoryIds
    }
  };
}

export async function findProductBySlug(orgId: Types.ObjectId, slug: string) {
  await db;
  const product = await Product.findOne({ orgId, slug }).lean();
  if (!product) return null;
  return serializeProduct(product as MarketplaceProduct);
}


