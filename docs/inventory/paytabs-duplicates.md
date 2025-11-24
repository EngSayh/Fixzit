=== PayTabs Duplicate Analysis ===

## ./docs/inventory/paytabs-duplicates.md

3 ./docs/inventory/paytabs-duplicates.md
=== PayTabs Duplicate Analysis ===

## ./docs/inventory/paytabs-duplicates.md

3 ./docs/inventory/paytabs-duplicates.md

## ./lib/paytabs.config.ts

7 ./lib/paytabs.config.ts
import 'server-only';
export const PAYTABS_CONFIG = {
profileId: process.env.PAYTABS_PROFILE_ID || '',
serverKey: process.env.PAYTABS_SERVER_KEY || '',
baseUrl: process.env.PAYTABS_BASE_URL || '<https://secure.paytabs.sa>'
};

## ./lib/paytabs.ts

207 ./lib/paytabs.ts
const REGIONS: Record<string,string> = {
KSA: '<https://secure.paytabs.sa>', UAE: '<https://secure.paytabs.com>',
EGYPT:'<https://secure-egypt.paytabs.com>', OMAN:'<https://secure-oman.paytabs.com>',
JORDAN:'<https://secure-jordan.paytabs.com>', KUWAIT:'<https://secure-kuwait.paytabs.com>',
GLOBAL:'<https://secure-global.paytabs.com>'
};

export function paytabsBase(region='GLOBAL'){ return REGIONS[region] || REGIONS.GLOBAL; }

export async function createHppRequest(region:string, payload:any) {
const r = await fetch(`${paytabsBase(region)}/payment/request`, {
method:'POST',
headers: {
'Content-Type':'application/json',
'authorization': process.env.PAYTABS_SERVER_KEY!,
},
body: JSON.stringify(payload)
});
return r.json();
}

## ./qa/tests/README-paytabs-unit-tests.md

15 ./qa/tests/README-paytabs-unit-tests.md
PayTabs unit-style tests

Framework in use

- Playwright Test (@playwright/test) — reusing the project's existing test runner. No new dependencies are introduced.

What’s covered

- paytabsBase: region URL resolution and fallbacks
- createHppRequest: request shape, headers, and error propagation
- createPaymentPage: payload correctness, formatting, language/shipping flags, fallbacks, edge cases (amounts, characters)
- verifyPayment: request payload and error propagation
- validateCallback: placeholder signature behavior
- Constants and helpers: PAYMENT_METHODS, CURRENCIES, and getAvailablePaymentMethods structure

Notes

- Global fetch is stubbed per-test to avoid real network calls.
- Environment variables that are read once at module import (via PAYTABS_CONFIG) are set within each test file before importing the module. Playwright runs each spec file in an isolated worker process, ensuring clean state across files.

## ./qa/tests/api-paytabs-callback.spec.ts

279 ./qa/tests/api-paytabs-callback.spec.ts
/\*\*

- Tests for PayTabs callback API route.
-
- Framework: Jest-style (describe/it/expect). If using Vitest, replace jest.fn with vi.fn and adjust mocks accordingly.
-
- Scenarios covered:
- - Invalid signature -> 401 with { ok: false, error: 'Invalid signature' }
- - Success path (resp_status 'A') with valid positive amount -> 200, status 'PAID', calls generateZATCAQR with correct args
- - Success path with invalid amount (NaN / <= 0) -> 400 with { ok: false, error: 'Invalid amount' }
- - Failure path (non-'A' status) -> 200 with status 'FAILED', does not call generateZATCAQR
- - Malformed JSON body -> 500 with { ok: false, error: 'Callback processing failed' }
    \*/

import type { NextRequest } from 'next/server';

// Attempt to import the route handler from common Next.js locations.
// Adjust as necessary for the repository's actual route path.
let POST: (req: NextRequest) => Promise<Response>;
// These paths are tried in order; the first that succeeds will be used.
// If your project uses a different path, update TARGET_ROUTE_PATH.

## ./qa/tests/lib-paytabs.base-and-hpp.spec.ts

113 ./qa/tests/lib-paytabs.base-and-hpp.spec.ts
// Framework: Playwright Test (@playwright/test)
import { test, expect } from '@playwright/test';

test.describe('lib/paytabs - paytabsBase & createHppRequest', () => {
test('paytabsBase resolves region URLs and falls back to GLOBAL', async () => {
const { paytabsBase } = await import('../../src/lib/paytabs');

    expect(paytabsBase('KSA')).toBe('https://secure.paytabs.sa');
    expect(paytabsBase('UAE')).toBe('https://secure.paytabs.com');
    expect(paytabsBase('EGYPT')).toBe('https://secure-egypt.paytabs.com');
    expect(paytabsBase('OMAN')).toBe('https://secure-oman.paytabs.com');
    expect(paytabsBase('JORDAN')).toBe('https://secure-jordan.paytabs.com');
    expect(paytabsBase('KUWAIT')).toBe('https://secure-kuwait.paytabs.com');

    // Fallbacks
    expect(paytabsBase()).toBe('https://secure-global.paytabs.com');
    expect(paytabsBase('UNKNOWN' as any)).toBe('https://secure-global.paytabs.com');
    expect(paytabsBase('' as any)).toBe('https://secure-global.paytabs.com');
    expect(paytabsBase(null as any)).toBe('https://secure-global.paytabs.com');

## ./qa/tests/lib-paytabs.create-payment.custom-base.spec.ts

98 ./qa/tests/lib-paytabs.create-payment.custom-base.spec.ts
// Framework: Playwright Test (@playwright/test)
import { test, expect } from '@playwright/test';

test.describe('lib/paytabs - custom base URL via env', () => {
test('createPaymentPage uses PAYTABS_BASE_URL when provided', async () => {
process.env.PAYTABS_BASE_URL = '<https://custom.paytabs.example>';
process.env.PAYTABS_PROFILE_ID = 'custom-profile';
process.env.PAYTABS_SERVER_KEY = 'custom-key';

    const { createPaymentPage } = await import('../../src/lib/paytabs');

    const originalFetch = globalThis.fetch;
    const calls: any[] = [];
    globalThis.fetch = ((...args: any[]) => {
      calls.push(args);
      return Promise.resolve({ json: async () => ({ redirect_url: 'url', tran_ref: 'ref' }) } as any);
    }) as any;

    try {
      await createPaymentPage({

## ./qa/tests/lib-paytabs.create-payment.default.spec.ts

269 ./qa/tests/lib-paytabs.create-payment.default.spec.ts
// Framework: Playwright Test (@playwright/test)
import { test, expect } from '@playwright/test';

test.describe('lib/paytabs - createPaymentPage (default base URL)', () => {
test('creates payment page successfully and posts correct payload', async () => {
delete process.env.PAYTABS_BASE_URL; // force default to GLOBAL
process.env.PAYTABS_PROFILE_ID = 'test-profile-id';
process.env.PAYTABS_SERVER_KEY = 'test-server-key';

    const { createPaymentPage } = await import('../../src/lib/paytabs');

    const validRequest = {
      amount: 150.5,
      currency: 'SAR',
      customerDetails: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+966501234567',
        address: '123 Main St',
        city: 'Riyadh',

## ./qa/tests/lib-paytabs.spec.ts

403 ./qa/tests/lib-paytabs.spec.ts
/\*\*

- Tests for PayTabs integration helpers.
- Testing framework: Jest (ts-jest or Babel/Jest setup assumed).
- If your project uses Vitest/Mocha, adapt describe/it/expect/mocking accordingly.
  \*/

// We will dynamically import the module under test using a relative path guess.
// Update the import below to match your actual module path if different.
// Try common locations in order via require.resolve in a try/catch chain.
interface PayTabsHelpers {
// Add expected function signatures here, e.g.:
// createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
// verifyPayment(id: string): Promise<VerificationResult>;
// For now, use index signature to allow any property, but avoid `any` type.
[key: string]: unknown;
}
let lib: PayTabsHelpers;
// Define the exact path to the PayTabs helpers module here.
const PAYTABS_HELPERS_MODULE_PATH = '../../lib-paytabs'; // <-- Update this path as needed
function loadModule() {

## ./qa/tests/lib-paytabs.verify-and-utils.spec.ts

67 ./qa/tests/lib-paytabs.verify-and-utils.spec.ts
// Framework: Playwright Test (@playwright/test)
import { test, expect } from '@playwright/test';

test.describe('lib/paytabs - validateCallback, constants, and helpers', () => {
test('validateCallback: signature equals generated value (placeholder empty string)', async () => {
const { validateCallback } = await import('../../src/lib/paytabs');

    // Placeholder generateSignature returns ''
    expect(validateCallback({}, '')).toBe(true);
    expect(validateCallback({ any: 'thing' }, '')).toBe(true);

    expect(validateCallback({}, 'x')).toBe(false);
    expect(validateCallback(null as any, 'x')).toBe(false);
    expect(validateCallback({ a: 1 }, undefined as any)).toBe(false);

});

test('PAYMENT_METHODS and CURRENCIES have expected mappings', async () => {
const { PAYMENT_METHODS, CURRENCIES } = await import('../../src/lib/paytabs');

    expect(PAYMENT_METHODS).toMatchObject({

## ./services/paytabs.ts

104 ./services/paytabs.ts
import PaymentMethod from '../db/models/PaymentMethod';
import Subscription from '../db/models/Subscription';
import OwnerGroup from '../db/models/OwnerGroup';
import { provisionSubscriber } from './provision';

export interface NormalizedPayTabsPayload {
tran_ref?: string;
respStatus?: string;
token?: string;
customer_email?: string;
cart_id?: string;
amount?: number;
currency?: string;
maskedCard?: string;
}

export function normalizePayTabsPayload(data: any): NormalizedPayTabsPayload {
const paymentInfo = data?.payment_info || {};
return {
tran_ref: data?.tran_ref || data?.tranRef,

## ./src/lib/paytabs.config.ts

7 ./src/lib/paytabs.config.ts
import 'server-only';
export const PAYTABS_CONFIG = {
profileId: process.env.PAYTABS_PROFILE_ID || '',
serverKey: process.env.PAYTABS_SERVER_KEY || '',
baseUrl: process.env.PAYTABS_BASE_URL || '<https://secure.paytabs.sa>'
};

## ./src/lib/paytabs.ts

207 ./src/lib/paytabs.ts
const REGIONS: Record<string,string> = {
KSA: '<https://secure.paytabs.sa>', UAE: '<https://secure.paytabs.com>',
EGYPT:'<https://secure-egypt.paytabs.com>', OMAN:'<https://secure-oman.paytabs.com>',
JORDAN:'<https://secure-jordan.paytabs.com>', KUWAIT:'<https://secure-kuwait.paytabs.com>',
GLOBAL:'<https://secure-global.paytabs.com>'
};

export function paytabsBase(region='GLOBAL'){ return REGIONS[region] || REGIONS.GLOBAL; }

export async function createHppRequest(region:string, payload:any) {
const r = await fetch(`${paytabsBase(region)}/payment/request`, {
method:'POST',
headers: {
'Content-Type':'application/json',
'authorization': process.env.PAYTABS_SERVER_KEY!,
},
body: JSON.stringify(payload)
});
return r.json();
}

## ./src/services/paytabs.ts

104 ./src/services/paytabs.ts
import PaymentMethod from '../db/models/PaymentMethod';
import Subscription from '../db/models/Subscription';
import OwnerGroup from '../db/models/OwnerGroup';
import { provisionSubscriber } from './provision';

export interface NormalizedPayTabsPayload {
tran_ref?: string;
respStatus?: string;
token?: string;
customer_email?: string;
cart_id?: string;
amount?: number;
currency?: string;
maskedCard?: string;
}

export function normalizePayTabsPayload(data: any): NormalizedPayTabsPayload {
const paymentInfo = data?.payment_info || {};
return {
tran_ref: data?.tran_ref || data?.tranRef,

## ./tests/paytabs.test.ts

379 ./tests/paytabs.test.ts
/\*\*

- Comprehensive tests for PayTabs integration helpers.
- Testing library/framework: Vitest
-
- These tests attempt to import the PayTabs module from common paths.
- If import fails, adjust the candidate paths in importPaytabs() to match your project.
  \*/

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Keep a pristine copy of the environment
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
vi.resetModules();
vi.restoreAllMocks();
// Reset environment for each test
process.env = { ...ORIGINAL_ENV };
});

## ./tests/unit/api/api-paytabs-callback.spec.ts

283 ./tests/unit/api/api-paytabs-callback.spec.ts
/\*\*

- Tests for PayTabs callback API route.
-
- Framework: Jest-style (describe/it/expect). If using Vitest, replace jest.fn with vi.fn and adjust mocks accordingly.
-
- Scenarios covered:
- - Invalid signature -> 401 with { ok: false, error: 'Invalid signature' }
- - Success path (resp_status 'A') with valid positive amount -> 200, status 'PAID', calls generateZATCAQR with correct args
- - Success path with invalid amount (NaN / <= 0) -> 400 with { ok: false, error: 'Invalid amount' }
- - Failure path (non-'A' status) -> 200 with status 'FAILED', does not call generateZATCAQR
- - Malformed JSON body -> 500 with { ok: false, error: 'Callback processing failed' }
    \*/

import type { NextRequest } from 'next/server';

// Attempt to import the route handler from common Next.js locations.
// Adjust as necessary for the repository's actual route path.
let POST: (req: NextRequest) => Promise<Response>;
// These paths are tried in order; the first that succeeds will be used.
// If your project uses a different path, update TARGET_ROUTE_PATH.

## ./tests/unit/api/api-paytabs.spec.ts

223 ./tests/unit/api/api-paytabs.spec.ts
/\*\*

- Tests for PayTabs payment page creation route handler (POST).
- Framework: Jest (TypeScript). If using Vitest, replace jest._with vi._ equivalents.
  \*/
  import { describe, test, expect, jest, beforeEach, beforeAll, afterEach } from '@jest/globals';
  import type { NextRequest } from 'next/server'

// Mock next/server to isolate NextResponse and avoid runtime coupling
jest.mock('next/server', () => {
const actual = jest.requireActual('next/server')
// Provide a minimal NextResponse.json that returns a standard Response-like object
return {
...actual,
NextResponse: {
json: (data: any, init?: ResponseInit) => {
const status = init?.status ?? 200
// Return a Response-like object with status and json() for assertions
return {
status,
async json() {
