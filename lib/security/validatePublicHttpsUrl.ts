import { validatePublicHttpsUrl as baseValidate, URLValidationError } from "./validate-public-https-url";

/**
 * Throwing wrapper around the canonical SSRF-safe validator to keep all callers
 * on a single ruleset (HTTPS-only, no localhost/private/internal TLDs).
 */
export function validatePublicHttpsUrl(url: string, fieldName: string): void {
  try {
    baseValidate(url);
  } catch (err) {
    if (err instanceof URLValidationError) {
      throw new Error(`${fieldName}: ${err.message}`);
    }
    throw new Error(`${fieldName}: Invalid URL`);
  }
}
