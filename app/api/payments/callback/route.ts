/**
 * @fileoverview Payments Callback Shim Route
 * @description Backwards-compatibility endpoint that redirects to the TAP webhook handler.
 * This route exists to maintain API compatibility during the TAP-only payment system.
 * @module api/payments/callback
 * @see {@link ../tap/webhook/route} for the actual implementation
 */

// Backwards-compatibility shim: `/api/payments/callback` now defers to the
// TAP webhook handler that lives under `/api/payments/tap/webhook`.
export { POST } from "../tap/webhook/route";
