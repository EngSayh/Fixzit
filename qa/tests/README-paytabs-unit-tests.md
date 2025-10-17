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
