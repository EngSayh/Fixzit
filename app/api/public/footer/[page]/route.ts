import { NextRequest, NextResponse } from 'next/server';
import { FooterContent } from '@/server/models/FooterContent';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';

/**
 * GET /api/public/footer/:page
 * Public endpoint to fetch footer content by page (about, privacy, terms)
 * Returns content in both EN and AR
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { page: string } }
) {
  try {
    await connectToDatabase();

    const { page } = params;

    // Validate page parameter
    if (!['about', 'privacy', 'terms'].includes(page)) {
      return NextResponse.json(
        { error: 'Invalid page. Must be one of: about, privacy, terms' },
        { status: 400 }
      );
    }

    // Find footer content for this page
    // @ts-ignore - Mongoose type inference issue with conditional model export
    const footerContent = (await FooterContent.findOne({ page }).lean().exec()) as {
      page: string;
      contentEn: string;
      contentAr: string;
      updatedAt: Date;
    } | null;

    if (!footerContent) {
      // Return default empty content if not found
      return NextResponse.json({
        page,
        contentEn: '',
        contentAr: '',
        updatedAt: null
      });
    }

    // Return public-safe data
    return NextResponse.json({
      page: footerContent.page,
      contentEn: footerContent.contentEn,
      contentAr: footerContent.contentAr,
      updatedAt: footerContent.updatedAt
    });

  } catch (error) {
    logger.error(`[GET /api/public/footer/${params.page}] Error`, { error });
    return NextResponse.json(
      { error: 'Failed to fetch footer content' },
      { status: 500 }
    );
  }
}
