/**
 * Aqar Souq - Create Listing API
 * 
 * POST /api/aqar/listings
 */

import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import { connectDb } from '@/lib/mongo';
import { AqarListing, AqarPackage } from '@/models/aqar';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { ok, badRequest, forbidden, serverError } from '@/lib/api/http';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  
  try {
    await connectDb();
    
    const user = await getSessionUser(request);
      
      // JSON validation guard
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object') {
        return badRequest('Invalid JSON body', { correlationId });
      }
      
      // Type-aware validation
      const missingString = ['intent', 'propertyType', 'title', 'description', 'city', 'source']
        .filter((f) => typeof body[f] !== 'string' || !body[f].trim());
      const invalidNumbers = ['price', 'areaSqm']
        .filter((f) => typeof body[f] !== 'number' || body[f] <= 0);
      const validGeo =
        body.geo?.type === 'Point' &&
        Array.isArray(body.geo.coordinates) &&
        body.geo.coordinates.length === 2 &&
        body.geo.coordinates.every((n: unknown) => typeof n === 'number');
      
      const missing = [...missingString, ...invalidNumbers, ...(validGeo ? [] : ['geo'])];
      if (missing.length) {
        return badRequest(`Missing/invalid fields: ${missing.join(', ')}`, { correlationId });
      }
      
      // Check if user has active package (for agents/developers)
      if (body.source === 'AGENT' || body.source === 'DEVELOPER') {
        const activePackage = await AqarPackage.findOne({
          userId: user.id,
          active: true,
          expiresAt: { $gt: new Date() },
          $expr: { $lt: ['$listingsUsed', '$listingsAllowed'] },
        });
        
        if (!activePackage) {
          return forbidden('No active listing package. Please purchase a package first.', { correlationId });
        }
        
        // Consume package listing
        await (activePackage as unknown as { consumeListing: () => Promise<void> }).consumeListing();
      }
      
      // Create listing
      const created = await (AqarListing as any).create({
        ...body,
        listerId: user.id,
        orgId: user.orgId || user.id,
        status: 'DRAFT',
      });
      
      // Sanitize response
      const { _id, title, price, areaSqm, city, status, listerId, orgId, media, amenities, geo, createdAt } =
        created.toObject?.() ?? created;
      
      return ok(
        { listing: { _id, title, price, areaSqm, city, status, listerId, orgId, media, amenities, geo, createdAt } },
        { correlationId },
        201
      );
    } catch (error: unknown) {
      const msg = String((error as Error)?.message || '');
      if (/package|quota/i.test(msg)) {
        return forbidden('Package quota required or exhausted', { correlationId });
      }
      if (/broker ads require/i.test(msg)) {
        return badRequest('Broker ad prerequisites not met', { correlationId });
      }
      logger.error('LISTINGS_POST_ERROR', { correlationId, msg });
      return serverError('Unexpected error', { correlationId });
    }
}
