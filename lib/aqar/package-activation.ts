import { logger } from "@/lib/logger";
/**
 * Aqar Package Activation Utility
 *
 * This helper should be called from payment webhooks/callbacks when
 * AqarPackage payments are successfully processed.
 */

import mongoose from "mongoose";
import { AqarPackage, AqarPayment, PaymentStatus } from "@/models/aqar";

/**
 * Activates an Aqar package after successful payment
 *
 * Call this from payment webhook handlers when payment succeeds:
 * - app/api/payments/callback/route.ts
 * - app/api/payments/paytabs/callback/route.ts
 *
 * @param paymentId - The AqarPayment ID that was paid
 * @returns true if activation succeeded, false otherwise
 */
export async function activatePackageAfterPayment(
  paymentId: string | mongoose.Types.ObjectId,
): Promise<boolean> {
  try {
    // Find the payment
    const payment = await AqarPayment.findById(paymentId);

    if (!payment) {
      logger.error("activatePackageAfterPayment: Payment not found", {
        paymentId,
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

    // Find and activate the package
    const pkg = await AqarPackage.findById(payment.relatedId);

    if (!pkg) {
      logger.error("activatePackageAfterPayment: Package not found", {
        paymentId,
        packageId: payment.relatedId,
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
