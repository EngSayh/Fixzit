// Backwards-compatibility shim: `/api/payments/callback` now defers to the
// enhanced PayTabs webhook handler that lives under `/api/payments/paytabs/callback`.
export { POST } from '../paytabs/callback/route';
