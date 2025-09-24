import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import Listing from '@/src/server/models/Listing';

// Ensure single handler export only; remove any legacy duplicates
export const dynamic = 'force-dynamic';

/**
 * GET handler that returns paginated marketplace listings with filtering by type, category, city, and price.
 *
 * Connects to the database (unless running in static-generation build phase), parses query parameters
 * (type, category, city, minPrice, maxPrice, limit, offset), builds a MongoDB filter for active listings,
 * retrieves matching documents, normalizes each item into a unified shape for properties and materials,
 * and responds with JSON containing `data`, `pagination`, and the applied `filters`.
 *
 * In production build phase (`NEXT_PHASE === 'phase-production-build'`) returns a lightweight static payload.
 *
 * @returns A NextResponse JSON payload:
 *  - on success: { success: true, data: Array, pagination: { total, limit, offset, hasMore }, filters: { type, category, city, priceRange } }
 *  - on error: HTTP 500 with { success: false, error: 'Internal server error' }
 */
export async function GET(req: NextRequest) {
	try {
		// Handle static generation
		if (process.env.NEXT_PHASE === 'phase-production-build') {
			return NextResponse.json({
				items: [],
				total: 0,
				hasMore: false,
				message: 'Static generation mode'
			});
		}

		await dbConnect();

		const { searchParams } = new URL(req.url);
		const type = (searchParams.get('type') || 'property').toLowerCase(); // property, material
		const category = searchParams.get('category') || undefined;
		const city = searchParams.get('city') || undefined;
		const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
		const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
		const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 60);
		const offset = parseInt(searchParams.get('offset') || '0');

		const filter: any = { status: 'active' };
		if (type === 'property') filter.type = 'property';
		else if (type === 'material') filter.type = 'material';
		else filter.type = { $in: ['property', 'material'] };

		if (category) {
			if (type === 'property') filter['property.category'] = category;
			else filter['material.category'] = category;
		}

		if (city) {
			if (type === 'property') filter['property.location.city'] = city;
			else filter.$or = [
				{ 'material.brand': new RegExp(city, 'i') },
				{ 'seller.company.name': new RegExp(city, 'i') }
			];
		}

		if (minPrice !== undefined || maxPrice !== undefined) {
			filter.price = {};
			if (minPrice !== undefined) filter.price.$gte = minPrice;
			if (maxPrice !== undefined) filter.price.$lte = maxPrice;
		}

		const total = await Listing.countDocuments(filter);
		const items = await Listing.find(filter)
			.sort({ publishedAt: -1 })
			.skip(offset)
			.limit(limit)
			.lean();

		const data = items.map((doc: any) => {
			const base = {
				id: String(doc._id),
				type: doc.type,
				title: doc.title,
				price: doc.price,
				currency: doc.currency || 'SAR',
				image: doc.media?.images?.[0]?.url || null,
				publishedAt: doc.publishedAt,
			};
			if (doc.type === 'property') {
				return {
					...base,
					city: doc.property?.location?.city,
					district: doc.property?.location?.district,
					bedrooms: doc.property?.bedrooms || 0,
					bathrooms: doc.property?.bathrooms || 0,
					area: doc.property?.area || 0,
					verified: doc.verification?.status === 'verified',
					url: `/marketplace/properties/${doc._id}`
				};
			}
			return {
				...base,
				name: doc.title, // compatibility with materials UI
				category: doc.material?.category,
				brand: doc.material?.brand,
				inStock: (doc.material?.quantity || 0) > 0,
				rating: 0,
				reviews: 0,
				url: `/marketplace/materials`
			};
		});

		return NextResponse.json({
			success: true,
			data,
			pagination: {
				total,
				limit,
				offset,
				hasMore: offset + limit < total
			},
			filters: {
				type,
				category: category || 'All',
				city: city || '',
				priceRange: {
					min: minPrice || 0,
					max: maxPrice || 1000000
				}
			}
		});
	} catch (error) {
		console.error('Marketplace browse API error:', error);
		return NextResponse.json({
			success: false,
			error: 'Internal server error'
		}, { status: 500 });
	}
}
