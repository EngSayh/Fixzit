Testing framework used: Jest + TypeScript (ts-jest).
If your repository uses a different framework (e.g., Vitest), adjust imports and configuration accordingly.

Notes on expected test-time warnings:
- CORS security tests deliberately log blocked origins; seeing `[SecurityEvent] ... cors_block` indicates the block path is exercised.
- Encryption tests warn when `ENCRYPTION_KEY` is not set in non-production; those tests validate the mock/fallback behavior and do not represent failures.
