/**
 * ⚠️ DEPRECATED: This file is deprecated to prevent Edge Runtime issues
 * 
 * Use @/lib/mongoUtils.server instead, which is marked as server-only
 * and will properly error if accidentally imported in client/edge code.
 * 
 * This stub exists to provide a helpful error message if old imports remain.
 */

export async function getNextAtomicUserCode(): Promise<string> {
  throw new Error(
    'mongoUtils.ts is deprecated. Use @/lib/mongoUtils.server instead. ' +
    'This prevents Edge Runtime compilation errors with mongoose.'
  );
}
