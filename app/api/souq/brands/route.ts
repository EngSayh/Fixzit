import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import Brand from '@/server/models/souq/Brand';
import { connectToDatabase } from '@/lib/mongodb-unified';

/**
 * GET /api/souq/brands - List all brands
 */
export async function GET() {
  try {
    await connectToDatabase();
    
    const brands = await Brand.find({ isActive: true })
      .select('name name_ar slug logo isVerified')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: brands,
      total: brands.length,
    });
  } catch (error) {
    console.error('GET /api/souq/brands error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/souq/brands - Create new brand (Admin only)
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();
    
    const body = await request.json();
    const { name, name_ar, slug, logo } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    const existingSlug = await Brand.findOne({ slug });
    if (existingSlug) {
      return NextResponse.json(
        { error: 'Brand slug already exists' },
        { status: 409 }
      );
    }

    const brand = await Brand.create({
      name,
      name_ar,
      slug,
      logo,
      isVerified: false,
      isActive: true,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: brand,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/souq/brands error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create brand' },
      { status: 500 }
    );
  }
}
