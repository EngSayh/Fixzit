import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import Category from '@/server/models/souq/Category';
import { connectToDatabase } from '@/lib/mongodb-unified';

/**
 * GET /api/souq/categories - List all categories with hierarchy
 */
export async function GET() {
  try {
    await connectToDatabase();
    
    const categories = await Category.find({ isActive: true })
      .select('name name_ar slug parentId level imageUrl')
      .sort({ level: 1, name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: categories,
      total: categories.length,
    });
  } catch (error) {
    console.error('GET /api/souq/categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/souq/categories - Create new category (Admin only)
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'super_admin' && userRole !== 'fm_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();
    
    const body = await request.json();
    const { name, name_ar, slug, parentId, level } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    const existingSlug = await Category.findOne({ slug });
    if (existingSlug) {
      return NextResponse.json(
        { error: 'Category slug already exists' },
        { status: 409 }
      );
    }

    const category = await Category.create({
      name,
      name_ar,
      slug,
      parentId: parentId || null,
      level: level ?? 1,
      isActive: true,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: category,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/souq/categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
