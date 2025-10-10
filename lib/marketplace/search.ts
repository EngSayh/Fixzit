import fs from 'fs';
import path from 'path';
import { MarketplaceProduct } from '@/server/models/marketplace/Product';
import { Types } from 'mongoose';
import Product from '@/server/models/marketplace/Product';
import { db } from '@/lib/mongo';
import { serializeProduct } from './serializers';

interface SynonymMap {
  brand: Record<string, string[]>;
  product: Record<string, string[]>;
}

let cachedSynonyms: SynonymMap | undefined;

function loadSynonyms(): SynonymMap {
  if (cachedSynonyms) return cachedSynonyms;
  const filePath = path.join(process.cwd(), 'search', 'synonyms.json');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    cachedSynonyms = JSON.parse(content);
    return cachedSynonyms!;
  } catch (error) {
    console.warn('Marketplace search synonyms unavailable, using defaults', error);
    cachedSynonyms = { brand: {}, product: {} };
    return cachedSynonyms!;
  }
}

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

export async function searchProducts(filters: MarketplaceSearchFilters) {
  await db;
  const query: Record<string, any> = { orgId: filters.orgId, status: 'ACTIVE' };

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
    query['buy.price'] = {};
    if (filters.minPrice != null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (query['buy.price'] as any).$gte = filters.minPrice;
    }
    if (filters.maxPrice != null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (query['buy.price'] as any).$lte = filters.maxPrice;
    }
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

  const categoryIds = categoriesAggregation.map(item => item._id as Types.ObjectId);

  return {
    items: items.map(item => serializeProduct(item as MarketplaceProduct)),
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


