/**
 * @fileoverview Payments Callback Shim Route
 * @description Backwards-compatibility endpoint that redirects to the enhanced PayTabs webhook handler.
 * This route exists to maintain API compatibility during the PayTabs integration migration.
 * @module api/payments/callback
 * @see {@link ../paytabs/callback/route} for the actual implementation
 */

// Backwards-compatibility shim: `/api/payments/callback` now defers to the
// enhanced PayTabs webhook handler that lives under `/api/payments/paytabs/callback`.
export { POST } from "../paytabs/callback/route";
