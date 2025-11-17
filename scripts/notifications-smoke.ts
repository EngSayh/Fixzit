#!/usr/bin/env tsx
/**
 * @deprecated This file has been moved to qa/notifications/run-smoke.ts
 * 
 * This script is kept for backward compatibility only.
 * Please update your commands to use:
 * 
 *   pnpm tsx qa/notifications/run-smoke.ts --channel email
 *   pnpm tsx qa/notifications/run-smoke.ts --channel email --channel sms
 *   pnpm tsx qa/notifications/run-smoke.ts --channel push --channel email --channel sms --channel whatsapp
 * 
 * For full documentation, see:
 * - NOTIFICATION_SMOKE_TEST_QUICKSTART.md
 * - NOTIFICATION_CREDENTIALS_GUIDE.md
 */

// Suppress async hooks and inspector
if (process.stderr?.write) {
  process.stderr.write('\n⚠️  WARNING: This script has been moved!\n\n');
  process.stderr.write('Please use: pnpm tsx qa/notifications/run-smoke.ts --channel <channel>\n\n');
  process.stderr.write('Example: pnpm tsx qa/notifications/run-smoke.ts --channel email\n\n');
  process.stderr.write('For help, see: NOTIFICATION_SMOKE_TEST_QUICKSTART.md\n\n');
}

// Exit with error code for CI detection
process.exitCode = 1;
process.exit(1);
