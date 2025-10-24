import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/mongo';
import { Organization } from '@/server/models/Organization';

/**
 * @openapi
 * /api/organization/settings:
 *   get:
 *     summary: Get organization settings (public)
 *     description: Retrieves public organization settings including logo, name, and branding
 *     tags:
 *       - Organization
 *     responses:
 *       200:
 *         description: Organization settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 logo:
 *                   type: string
 *                 primaryColor:
 *                   type: string
 *                 secondaryColor:
 *                   type: string
 *       500:
 *         description: Server error
 */
export async function GET(_request: NextRequest) {
  try {
    await connectDb();

    // Get the first active organization (or you can get by orgId from session)
    const org = await Organization.findOne({ /* isActive: true */ }).select('name logo branding').lean();

    if (!org) {
      // Return default settings if no organization found
      return NextResponse.json({
        name: 'FIXZIT ENTERPRISE',
        logo: '/img/fixzit-logo.jpg',
        primaryColor: '#0061A8',
        secondaryColor: '#00A859'
      });
    }

    return NextResponse.json({
      name: (org as any).name || 'FIXZIT ENTERPRISE',
      logo: (org as any).logo || '/img/fixzit-logo.jpg',
      primaryColor: (org as any).branding?.primaryColor || '#0061A8',
      secondaryColor: (org as any).branding?.secondaryColor || '#00A859'
    });
  } catch (error) {
    console.error('Error fetching organization settings:', error);
    // Return default settings on error
    return NextResponse.json({
      name: 'FIXZIT ENTERPRISE',
      logo: '/img/fixzit-logo.jpg',
      primaryColor: '#0061A8',
      secondaryColor: '#00A859'
    });
  }
}
