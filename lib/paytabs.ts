/**
 * Deprecated mock module for PayTabs.
 * Do NOT import this file. Use `lib/paytabs/index.ts` instead.
 *
 * Docs: https://fixzit.enterprise/docs/payments/paytabs-setup
 */

// Throw immediately on import to prevent accidental usage in runtime (allowed in tests)
if (process.env.NODE_ENV !== 'test') {
  throw new Error(
    'Invalid import: lib/paytabs.ts is deprecated mock code. Import from lib/paytabs (index.ts) instead. See docs: https://fixzit.enterprise/docs/payments/paytabs-setup'
  );
}

// Provide a small guard export so TypeScript treats this as a module
export function __PAYTABS_DEPRECATED_MOCK_GUARD__(): never {
  throw new Error(
    'lib/paytabs.ts is deprecated. Import from lib/paytabs (index.ts) instead. See docs: https://fixzit.enterprise/docs/payments/paytabs-setup'
  );
}
