import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { PlatformSettings } from '@/server/models/PlatformSettings';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/logo/upload
 * Super Admin only endpoint to upload platform logo
 * Accepts multipart/form-data with 'logo' file field
 * Validates: file type (image/png, image/jpeg, image/svg+xml), size (<5MB)
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

    // Parse multipart form data
    const formData = await request.formData();
    const logoFile = formData.get('logo') as File | null;

    if (!logoFile) {
      return NextResponse.json(
        { error: 'No logo file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(logoFile.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (logoFile.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = logoFile.name.split('.').pop();
    const fileName = `logo-${timestamp}.${extension}`;
    
    // Define storage path (public/uploads/logos/)
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
    const filePath = path.join(uploadDir, fileName);
    const publicUrl = `/uploads/logos/${fileName}`;

    // Create directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Convert File to Buffer and save
    const bytes = await logoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Update or create platform settings
    const settings = await PlatformSettings.findOneAndUpdate(
      { orgId: user.orgId }, // Filter by orgId (from tenant isolation)
      {
        logoUrl: publicUrl,
        logoStorageKey: filePath,
        logoFileName: logoFile.name,
        logoMimeType: logoFile.type,
        logoFileSize: logoFile.size,
        updatedBy: user.id,
        updatedAt: new Date()
      },
      {
        upsert: true, // Create if doesn't exist
        new: true,     // Return updated document
        runValidators: true
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        logoUrl: settings.logoUrl,
        fileName: settings.logoFileName,
        fileSize: settings.logoFileSize,
        mimeType: settings.logoMimeType,
        updatedAt: settings.updatedAt
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

    logger.error('[POST /api/admin/logo/upload] Error', error);
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/logo
 * Super Admin only endpoint to get current logo settings
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

    const settings = await PlatformSettings.findOne({ orgId: user.orgId }).lean() as {
      logoUrl?: string;
      logoFileName?: string;
      logoFileSize?: number;
      logoMimeType?: string;
      updatedAt?: Date;
    } | null;

    if (!settings || !settings.logoUrl) {
      return NextResponse.json({
        logoUrl: null,
        fileName: null,
        fileSize: null,
        mimeType: null,
        updatedAt: null
      });
    }

    return NextResponse.json({
      logoUrl: settings.logoUrl,
      fileName: settings.logoFileName,
      fileSize: settings.logoFileSize,
      mimeType: settings.logoMimeType,
      updatedAt: settings.updatedAt
    });

  } catch (error) {
    // Handle authentication errors specifically
    if (error instanceof Error && error.message.includes('No valid token')) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    logger.error('[GET /api/admin/logo] Error', error);
    return NextResponse.json(
      { error: 'Failed to fetch logo settings' },
      { status: 500 }
    );
  }
}
