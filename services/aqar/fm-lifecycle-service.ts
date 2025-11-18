import { logger } from '@/lib/logger';
import { connectDb } from '@/lib/mongo';
import { AqarListing } from '@/models/aqar';
import {
  ListingStatus,
  type IListing,
  type IListingFmLifecycle,
} from '@/models/aqar/Listing';
import { generateZATCAQR } from '@/lib/zatca';
import { create as createWorkOrder } from '@/server/work-orders/wo.service';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

const listingModel = AqarListing as unknown as Model<IListing>;

const isDevEnvironment = ['development', 'test'].includes(process.env.NODE_ENV || '');

type ZatcaConfig = { sellerName: string; vatNumber: string } | null;

const validateZatcaConfig = (): ZatcaConfig => {
  const sellerName = process.env.ZATCA_SELLER_NAME?.trim();
  const vatNumber = process.env.ZATCA_VAT_NUMBER?.trim();
  const vatPattern = /^\d{15}$/;

  if (!sellerName || !vatNumber || !vatPattern.test(vatNumber)) {
    const message = 'ZATCA_SELLER_NAME and a 15-digit ZATCA_VAT_NUMBER are required to generate QR codes.';
    if (isDevEnvironment) {
      logger.warn(message, {
        sellerNamePresent: Boolean(sellerName),
        vatNumberLength: vatNumber?.length,
      });
      return null;
    }
    throw new Error(message);
  }

  return { sellerName, vatNumber };
};

const ZATCA_CONFIG = validateZatcaConfig();

export interface ListingLifecycleEvent {
  listingId: string;
  nextStatus: ListingStatus;
  prevStatus?: ListingStatus;
  actorId: string;
  tenantId?: string;
  transactionValue?: number;
  vatAmount?: number;
  notes?: string;
  autopilot?: boolean;
}

export class AqarFmLifecycleService {
  private static readonly TRIGGER_STATUSES = new Set<ListingStatus>([
    ListingStatus.RENTED,
    ListingStatus.SOLD,
  ]);

  static async handleStatusChange(event: ListingLifecycleEvent): Promise<void> {
    if (!Types.ObjectId.isValid(event.listingId)) {
      return;
    }
    if (!this.shouldTrigger(event)) {
      return;
    }

    await connectDb();
    const listing = await listingModel
      .findById(event.listingId)
      .select('title orgId listerId propertyRef price city neighborhood address fmLifecycle status')
      .lean<{ _id: Types.ObjectId; orgId: Types.ObjectId; listerId: Types.ObjectId; propertyRef?: Types.ObjectId; price?: { amount: number }; title?: string; city?: string; neighborhood?: string; address?: string; fmLifecycle?: IListing['fmLifecycle']; status: ListingStatus } | null>();

    if (!listing) {
      return;
    }

    const workOrder = await this.createLifecycleWorkOrder(listing, event);
    const fmLifecycle: IListingFmLifecycle = {
      autoCreateOn: listing.fmLifecycle?.autoCreateOn?.length
        ? listing.fmLifecycle.autoCreateOn
        : [ListingStatus.RENTED],
      propertyId: listing.fmLifecycle?.propertyId ?? listing.propertyRef,
      workOrderTemplateId: listing.fmLifecycle?.workOrderTemplateId,
      lastWorkOrderId: workOrder ? new Types.ObjectId(workOrder._id) : listing.fmLifecycle?.lastWorkOrderId,
      lastWorkOrderCreatedAt: workOrder ? new Date() : listing.fmLifecycle?.lastWorkOrderCreatedAt,
      lastTransactionValue: event.transactionValue ?? listing.fmLifecycle?.lastTransactionValue,
      lastVatAmount: event.vatAmount ?? listing.fmLifecycle?.lastVatAmount,
      zatcaQrBase64: listing.fmLifecycle?.zatcaQrBase64,
    };

    if (event.transactionValue) {
      const evidence = await this.generateZatcaEvidence(event.transactionValue, event.vatAmount);
      if (evidence) {
        fmLifecycle.zatcaQrBase64 = evidence.qr;
        fmLifecycle.lastVatAmount = evidence.vat;
      }
    }

    await listingModel.findByIdAndUpdate(event.listingId, {
      $set: { fmLifecycle },
    });
  }

  static async linkProperty(listingId: string, propertyId: string): Promise<void> {
    if (!Types.ObjectId.isValid(listingId) || !Types.ObjectId.isValid(propertyId)) {
      return;
    }
    await connectDb();
    await listingModel.findByIdAndUpdate(listingId, {
      $set: {
        'fmLifecycle.propertyId': new Types.ObjectId(propertyId),
      },
    });
  }

  private static shouldTrigger(event: ListingLifecycleEvent): boolean {
    if (!this.TRIGGER_STATUSES.has(event.nextStatus)) {
      return false;
    }
    if (event.prevStatus === event.nextStatus) {
      return false;
    }
    if (event.autopilot === false) {
      return false;
    }
    return true;
  }

  private static async createLifecycleWorkOrder(
    listing: {
      _id: Types.ObjectId;
      orgId: Types.ObjectId;
      listerId: Types.ObjectId;
      propertyRef?: Types.ObjectId;
      fmLifecycle?: IListing['fmLifecycle'];
      title?: string;
      city?: string;
      neighborhood?: string;
      address?: string;
    },
    event: ListingLifecycleEvent
  ) {
    const propertyId = listing.fmLifecycle?.propertyId ?? listing.propertyRef;
    if (!propertyId) {
      logger.warn('AQAR_FM_WORK_ORDER_SKIPPED', {
        listingId: listing._id.toHexString(),
        reason: 'missing_property_ref',
      });
      return null;
    }

    try {
      return await createWorkOrder(
        {
          orgId: listing.orgId.toHexString(),
          title:
            event.nextStatus === ListingStatus.RENTED
              ? `Post-rent inspection - ${listing.title || listing._id.toHexString()}`
              : `Post-sale handover - ${listing.title || listing._id.toHexString()}`,
          description:
            event.nextStatus === ListingStatus.RENTED
              ? 'Automatic work order to capture move-in inspection and IoT sensor baseline after rent contract.'
              : 'Automatic work order to trigger FM onboarding after sale completion.',
          propertyId: propertyId.toHexString(),
          requesterId: event.actorId,
          requesterName: 'Aqar Souq Automation',
          requesterType: 'SYSTEM',
          requesterEmail: undefined,
          priority: 'MEDIUM',
          category: 'REAL_ESTATE',
          type: 'POST_TRANSACTION',
          subcategory: event.nextStatus === ListingStatus.RENTED ? 'MOVE_IN' : 'HANDOVER',
          slaHours: 48,
          responseMinutes: 180,
          assignmentUserId: listing.listerId.toHexString(),
        },
        event.actorId
      );
    } catch (error) {
      logger.error('AQAR_FM_WORK_ORDER_FAILED', {
        listingId: listing._id.toHexString(),
        error: (error as Error)?.message ?? String(error),
      });
      return null;
    }
  }

  private static async generateZatcaEvidence(total: number, vat?: number) {
    if (Number.isNaN(total) || total <= 0) {
      return undefined;
    }
    try {
      if (!ZATCA_CONFIG) {
        return undefined;
      }
      const { sellerName, vatNumber } = ZATCA_CONFIG;
      const payload = {
        sellerName,
        vatNumber,
        timestamp: new Date().toISOString(),
        total: Number(total.toFixed(2)),
        vatAmount: Number((vat ?? total * 0.15).toFixed(2)),
      };
      const qr = await generateZATCAQR(payload);
      return { qr, vat: payload.vatAmount };
    } catch (error) {
      logger.warn('AQAR_ZATCA_QR_FAILED', {
        error: (error as Error)?.message ?? String(error),
      });
      return undefined;
    }
  }
}
