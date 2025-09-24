import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import Listing from '@/src/server/models/Listing';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * Fetches a property listing by MongoDB ObjectId or SEO slug and returns a public view.
 *
 * Attempts to connect to the database, then looks up a Listing by `_id` when `id` is a valid
 * MongoDB ObjectId or by `seo.slug` otherwise. If a listing is found and its `status` is `'active'`,
 * the handler returns the listing serialized via `toPublicJSON()` when available (falls back to
 * `toObject()`), wrapped in `{ success: true, data }`. If no active listing is found, responds with
 * a 404 and `{ success: false, error: 'Not found' }`. Unexpected errors produce a 500 with
 * `{ success: false, error: 'Internal server error' }`.
 *
 * @param params.id - The identifier provided in the route: either a MongoDB ObjectId string or an SEO slug.
 * @returns A NextResponse containing a JSON object with `success` and either `data` (on 200) or `error` (on 404/500).
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
	try {
		await dbConnect();
		const id = params.id;

		const query = mongoose.Types.ObjectId.isValid(id)
			? { _id: id }
			: { 'seo.slug': id };

		const doc: any = await Listing.findOne(query);
		if (!doc || doc.status !== 'active') {
			return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
		}

		// Use public serializer to mask sensitive fields when available
		const data = typeof doc.toPublicJSON === 'function' ? doc.toPublicJSON() : doc.toObject();

		return NextResponse.json({ success: true, data });
	} catch (err) {
		console.error('Property detail API error:', err);
		return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
}


