import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Product } from '@/src/server/models/Product';
import { SearchSynonym } from '@/src/server/models/SearchSynonym';

/**
 * Handles GET /api/marketplace/search — performs a filtered, paginated product search with sorting and facets.
 *
 * Accepts query parameters to filter and paginate results, expands the search query using synonyms, and returns matching products plus facet aggregations (categories, price range, vendors).
 *
 * Query parameters:
 * - q - Full-text search string; expanded via SearchSynonym.expandQuery(locale, q) when provided.
 * - category - Filter by product category.
 * - subcategory - Filter by product subcategory.
 * - minPrice - Minimum price (numeric string).
 * - maxPrice - Maximum price (numeric string).
 * - vendor - Filter by vendor ID.
 * - inStock - "true" to include only products with stock.quantity > 0.
 * - locale - 'en' or 'ar' used when expanding query synonyms (defaults to 'en').
 * - page - Page number for pagination (defaults to 1).
 * - limit - Items per page (defaults to 24, capped at 100).
 * - sort - Sort mode: 'relevance' (default, uses text score if `q` provided), 'price-asc', 'price-desc', 'newest', 'rating', or 'popularity'.
 *
 * Response (200):
 * - JSON shape: { success: true, data: { products, pagination, facets } }
 *   - products: array of product documents (selected fields: name, nameAr, description, descriptionAr, category, subcategory, sku, price, stock, images, ratings, vendorId). If a text query is used, each document may include a `score` textScore when relevant.
 *   - pagination: { page, limit, total, pages }.
 *   - facets:
 *     - categories: array of { _id: categoryValue, count } sorted by count desc.
 *     - priceRange: { min, max } or { min: 0, max: 0 } when unavailable.
 *     - vendors: array of { _id: vendorId, count } (top 10).
 *
 * On error returns JSON { success: false, error: 'Failed to search products' } with HTTP status 500.
 */
export async function GET(req: NextRequest) {
  try {
    await db();
    
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const vendor = searchParams.get('vendor');
    const inStock = searchParams.get('inStock') === 'true';
    const locale = (searchParams.get('locale') || 'en') as 'en' | 'ar';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '24', 10), 100);
    const sort = searchParams.get('sort') || 'relevance';

    // Build filter
    const filter: any = { 
      type: 'material',
      isActive: true 
    };
    
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (vendor) filter.vendorId = vendor;
    if (inStock) filter['stock.quantity'] = { $gt: 0 };
    
    if (minPrice || maxPrice) {
      filter['price.amount'] = {};
      if (minPrice) filter['price.amount'].$gte = parseFloat(minPrice);
      if (maxPrice) filter['price.amount'].$lte = parseFloat(maxPrice);
    }

    // Expand search query with synonyms
    let searchFilter = {};
    if (query) {
      const expandedTerms = await SearchSynonym.expandQuery(locale, query);
      
      if (expandedTerms.length > 1) {
        // Use expanded terms for search
        searchFilter = {
          $or: expandedTerms.map(term => ({
            $text: { $search: term }
          }))
        };
      } else {
        // Simple text search
        searchFilter = { $text: { $search: query } };
      }
    }

    // Combine filters
    const finalFilter = { ...filter, ...searchFilter };

    // Determine sort order
    let sortOrder: any = {};
    switch (sort) {
      case 'price-asc':
        sortOrder = { 'price.amount': 1 };
        break;
      case 'price-desc':
        sortOrder = { 'price.amount': -1 };
        break;
      case 'newest':
        sortOrder = { createdAt: -1 };
        break;
      case 'rating':
        sortOrder = { 'ratings.average': -1 };
        break;
      case 'popularity':
        sortOrder = { salesCount: -1 };
        break;
      case 'relevance':
      default:
        if (query) {
          sortOrder = { score: { $meta: 'textScore' } };
        } else {
          sortOrder = { createdAt: -1 };
        }
    }

    // Execute search
    const totalQuery = Product.countDocuments(finalFilter);
    const productsQuery = Product
      .find(finalFilter, query ? { score: { $meta: 'textScore' } } : {})
      .sort(sortOrder)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('name nameAr description descriptionAr category subcategory sku price stock images ratings vendorId');

    const [total, products] = await Promise.all([totalQuery, productsQuery]);

    // Get aggregated data for filters
    const aggregations = await Product.aggregate([
      { $match: filter },
      {
        $facet: {
          categories: [
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          priceRange: [
            {
              $group: {
                _id: null,
                min: { $min: '$price.amount' },
                max: { $max: '$price.amount' }
              }
            }
          ],
          vendors: [
            { $group: { _id: '$vendorId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ]
        }
      }
    ]);

    const facets = aggregations[0] || {};

    return NextResponse.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        facets: {
          categories: facets.categories || [],
          priceRange: facets.priceRange?.[0] || { min: 0, max: 0 },
          vendors: facets.vendors || []
        }
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search products' 
      },
      { status: 500 }
    );
  }
}
