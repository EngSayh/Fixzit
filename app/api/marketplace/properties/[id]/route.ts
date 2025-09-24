import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import Listing from '@/src/server/models/Listing';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

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


