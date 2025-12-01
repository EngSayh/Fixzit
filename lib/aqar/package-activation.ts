import { logger } from "@/lib/logger";
import { buildOrgScopedFilter, isValidOrgId } from "@/lib/utils/org-scope";
/**
 * Aqar Package Activation Utility
 *
 * This helper should be called from payment webhooks/callbacks when
 * AqarPackage payments are successfully processed.
 */

import mongoose from "mongoose";
import { AqarPackage, AqarPayment, PaymentStatus } from "@/server/models/aqar";

/**
 * Activates an Aqar package after successful payment
 *
 * Call this from payment webhook handlers when payment succeeds:
 * - app/api/payments/callback/route.ts
 * - app/api/payments/paytabs/callback/route.ts
 *
 * @param paymentId - The AqarPayment ID that was paid
 * @param orgId - The organization ID for tenant-scoped queries (REQUIRED)
 * @returns true if activation succeeded, false otherwise
 */
export async function activatePackageAfterPayment(
  paymentId: string | mongoose.Types.ObjectId,
  orgId: string,
): Promise<boolean> {
  // SECURITY: orgId is required to prevent cross-tenant data access (fail-closed)
  if (!isValidOrgId(orgId, "activatePackageAfterPayment")) {
    logger.error("activatePackageAfterPayment: orgId is required for tenant isolation", {
      paymentId,
    });
    return false;
  }

  try {
    // Find the payment with org-scoped query (SECURITY: prevents cross-tenant reads)
    const payment = await AqarPayment.findOne(buildOrgScopedFilter(paymentId, orgId));

    if (!payment) {
      logger.error("activatePackageAfterPayment: Payment not found (or wrong org)", {
        paymentId,
        orgId,
      });
      return false;
    }

    // Verify it's a package payment
    if (payment.type !== "PACKAGE" || payment.relatedModel !== "AqarPackage") {
      logger.warn("activatePackageAfterPayment: Not a package payment", {
        paymentId,
        type: payment.type,
        relatedModel: payment.relatedModel,
      });
      return false;
    }

    // Verify payment is successful
    if (payment.status !== PaymentStatus.COMPLETED) {
      logger.warn(
        "activatePackageAfterPayment: Payment not marked as COMPLETED",
        {
          paymentId,
          status: payment.status,
        },
      );
      return false;
    }

    // Verify payment has a related package ID
    if (!payment.relatedId) {
      logger.error("activatePackageAfterPayment: Payment missing relatedId", {
        paymentId,
        orgId,
      });
      return false;
    }

    // Find and activate the package with org-scoped query (SECURITY: prevents cross-tenant reads)
    const pkg = await AqarPackage.findOne(buildOrgScopedFilter(payment.relatedId, orgId));

    if (!pkg) {
      logger.error("activatePackageAfterPayment: Package not found (or wrong org)", {
        paymentId,
        packageId: payment.relatedId,
        orgId,
      });
      return false;
    }

    // Mark package as paid
    if (!pkg.paidAt) {
      pkg.paidAt = new Date();
      await pkg.save();
    }

    // Activate if not already active
    if (!pkg.active) {
      await pkg.activate();
      logger.info(
        "activatePackageAfterPayment: Package activated successfully",
        {
          paymentId,
          packageId: (pkg as { _id: { toString(): string } })._id.toString(),
          userId: pkg.userId.toString(),
          type: pkg.type,
        },
      );
    }

    return true;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("activatePackageAfterPayment: Error activating package", {
      paymentId,
      error: String((error as Error)?.message || error),
    });
    return false;
  }
}

/**
 * Example usage in payment webhook:
 *
 * ```typescript
 * // After marking payment as successful
 * if (payment.status === PaymentStatus.COMPLETED && payment.type === 'PACKAGE') {
 *   await activatePackageAfterPayment(payment._id).catch(err => {
 *     console.error('Failed to activate package:', err);
 *   });
 * }
 * ```
 */
