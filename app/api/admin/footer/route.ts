import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { FooterContent } from '@/server/models/FooterContent';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/footer
 * Super Admin only endpoint to update footer content
 * Body: { page: 'about' | 'privacy' | 'terms', contentEn: string, contentAr: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication & Authorization
    const user = await getSessionUser(request);

    // SUPER_ADMIN only
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - SUPER_ADMIN access required' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const body = await request.json();
    const { page, contentEn, contentAr } = body;

    // Validation
    if (!page || !['about', 'privacy', 'terms'].includes(page)) {
      return NextResponse.json(
        { error: 'Invalid page. Must be one of: about, privacy, terms' },
        { status: 400 }
      );
    }

    if (typeof contentEn !== 'string' || typeof contentAr !== 'string') {
      return NextResponse.json(
        { error: 'Both contentEn and contentAr must be strings' },
        { status: 400 }
      );
    }

    // Upsert footer content (create if not exists, update if exists)
    const footerContent = await FooterContent.findOneAndUpdate(
      { page },
      {
        $set: {
          page,
          contentEn,
          contentAr,
          updatedBy: user.id,
          updatedAt: new Date()
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        page: footerContent.page,
        contentEn: footerContent.contentEn,
        contentAr: footerContent.contentAr,
        updatedAt: footerContent.updatedAt,
        updatedBy: footerContent.updatedBy
      }
    });

  } catch (error) {
    // Handle authentication errors specifically
    if (error instanceof Error && error.message.includes('No valid token')) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    logger.error('[POST /api/admin/footer] Error', { error });
    return NextResponse.json(
      { error: 'Failed to update footer content' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/footer?page=about
 * Super Admin only endpoint to fetch footer content for editing
 * Query: page (optional, returns all if not specified)
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication & Authorization
    const user = await getSessionUser(request);

    // SUPER_ADMIN only
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - SUPER_ADMIN access required' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page');

    if (page) {
      // Get specific page
      if (!['about', 'privacy', 'terms'].includes(page)) {
        return NextResponse.json(
          { error: 'Invalid page. Must be one of: about, privacy, terms' },
          { status: 400 }
        );
      }

      const footerContent = await FooterContent.findOne({ page }).lean();

      if (!footerContent) {
        // Return default empty content
        return NextResponse.json({
          page,
          contentEn: '',
          contentAr: '',
          updatedAt: null,
          updatedBy: null
        });
      }

      return NextResponse.json(footerContent);
    }

    // Get all footer pages
    const allContent = await FooterContent.find({}).lean();

    // Ensure all three pages exist (return defaults if missing)
    const pages = ['about', 'privacy', 'terms'];
    const result = pages.map((p: string) => {
      const existing = allContent.find((c: any) => c.page === p);
      return existing || {
        page: p,
        contentEn: '',
        contentAr: '',
        updatedAt: null,
        updatedBy: null
      };
    });

    return NextResponse.json({ data: result });

  } catch (error) {
    // Handle authentication errors specifically
    if (error instanceof Error && error.message.includes('No valid token')) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    logger.error('[GET /api/admin/footer] Error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch footer content' },
      { status: 500 }
    );
  }
}
