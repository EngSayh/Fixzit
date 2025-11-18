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
import { normalizeImmersive, normalizeProptech } from '@/app/api/aqar/listings/normalizers';
import { AqarRecommendationEngine } from '@/services/aqar/recommendation-engine';

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
      const invalidNumbers = ['areaSqm']
        .filter((f) => body[f] !== undefined && (typeof body[f] !== 'number' || body[f] <= 0));

      const locationGeo = body.location?.geo || body.geo;
      const validPricing =
        typeof body.price?.amount === 'number' &&
        body.price.amount > 0 &&
        typeof (body.price.currency || 'SAR') === 'string';

      const validGeo =
        locationGeo?.type === 'Point' &&
        Array.isArray(locationGeo.coordinates) &&
        locationGeo.coordinates.length === 2 &&
        locationGeo.coordinates.every((n: unknown) => typeof n === 'number');
      
      const missing = [
        ...missingString,
        ...invalidNumbers,
        ...(validPricing ? [] : ['price']),
        ...(validGeo ? [] : ['location.geo']),
      ];
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
      const orgId = user.orgId || user.id;
      const { proptech: proptechRaw, immersive: immersiveRaw, ...restBody } = body;
      const listingPayload = {
        ...restBody,
        orgId,
        listerId: user.id,
        location: {
          addressLine: body.location?.addressLine || body.address,
          cityId: body.location?.cityId || body.city,
          neighborhoodId: body.location?.neighborhoodId || body.neighborhood,
          geo: locationGeo,
        },
        price: {
          amount: body.price.amount,
          currency: body.price.currency || 'SAR',
          frequency: body.price.frequency || body.rentFrequency || null,
        },
        vatRate: typeof body.vatRate === 'number' ? body.vatRate : 15,
        media: Array.isArray(body.media) ? body.media : [],
        compliance: {
          falLicenseNo: body.compliance?.falLicenseNo,
          adPermitNo: body.compliance?.adPermitNo,
          brokerageContractId: body.compliance?.brokerageContractId,
          verifiedOwner: Boolean(body.compliance?.verifiedOwner),
          nafathVerified: Boolean(body.compliance?.nafathVerified),
          foreignOwnerCompliant: Boolean(body.compliance?.foreignOwnerCompliant),
          verifiedAt: body.compliance?.verifiedAt ? new Date(body.compliance.verifiedAt) : undefined,
        },
        boost: body.boost,
        auction: body.auction,
        rnplEligible: Boolean(body.rnplEligible),
        status: 'DRAFT',
      };

      if (listingPayload.intent === 'AUCTION') {
        listingPayload.auction = {
          isAuction: true,
          startAt: body.auction?.startAt ? new Date(body.auction.startAt) : undefined,
          endAt: body.auction?.endAt ? new Date(body.auction.endAt) : undefined,
          reserve: body.auction?.reserve,
          deposit: body.auction?.deposit,
          externalLink: body.auction?.externalLink,
        };
      }

      const proptechPayload = normalizeProptech(proptechRaw);
      if (proptechPayload) {
        listingPayload.proptech = proptechPayload;
      } else {
        delete listingPayload.proptech;
      }

      const immersivePayload = normalizeImmersive(immersiveRaw);
      if (immersivePayload) {
        listingPayload.immersive = immersivePayload;
      } else {
        delete listingPayload.immersive;
      }

      const created = await (AqarListing as any).create(listingPayload);
      
      // Sanitize response
      const {
        _id,
        title,
        price,
        areaSqm,
        city,
        status,
        listerId,
        media,
        amenities,
        location,
        rnplEligible,
        auction,
        createdAt,
      } =
        created.toObject?.() ?? created;
      
      void AqarRecommendationEngine.refreshForListing(_id.toString(), {
        intent: body.intent,
        propertyTypes: body.propertyType ? [body.propertyType] : undefined,
        preferredCity: body.city,
        updateAiSnapshot: true,
      }).catch((error: Error) => {
        logger.warn('AQAR_RECO_BOOTSTRAP_FAILED', {
          listingId: _id.toString(),
          error: error?.message,
        });
      });
      
      return ok(
        {
          listing: {
            _id,
            title,
            price,
            areaSqm,
            city,
            status,
            listerId,
            orgId,
            media,
            amenities,
            location,
            rnplEligible,
            auction,
            createdAt,
          },
        },
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
