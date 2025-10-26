import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const endAt = Date.now() + THREE_HOURS_MS;
let runNumber = 1;
const logFile = 'tests/loop-runner.log';

function log(message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}\n`;
  console.log(message);
  writeFileSync(logFile, entry, { flag: 'a' });
}

async function executeCommand(cmd, args, label) {
  log(`\n${'='.repeat(80)}`);
  log(`RUN #${runNumber}: ${label}`);
  log(`${'='.repeat(80)}\n`);
  
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, CI: '1' }
    });
    
    proc.on('close', (code) => {
      if (code !== 0) {
        log(`⚠️  ${label} exited with code ${code}`);
      } else {
        log(`✅ ${label} completed successfully`);
      }
      resolve(code);
    });
    
    proc.on('error', (err) => {
      log(`❌ ${label} error: ${err.message}`);
      resolve(1);
    });
  });
}

async function runVerificationCycle() {
  const startTime = Date.now();
  log(`\n${'#'.repeat(80)}`);
  log(`VERIFICATION CYCLE #${runNumber} STARTED`);
  log(`${'#'.repeat(80)}\n`);
  
  // Step 1: TypeScript type checking
  log('📋 Step 1/4: TypeScript Type Checking...');
  await executeCommand('pnpm', ['typecheck'], 'TypeScript Check');
  
  // Step 2: Linting
  log('\n📋 Step 2/4: ESLint...');
  await executeCommand('pnpm', ['lint', '--max-warnings=0'], 'ESLint');
  
  // Step 3: i18n scan
  log('\n📋 Step 3/4: i18n Key Verification...');
  await executeCommand('node', ['tests/i18n-scan.mjs'], 'i18n Scanner');
  
  // Step 4: E2E tests
  log('\n📋 Step 4/4: Playwright E2E Tests...');
  await executeCommand('pnpm', ['exec', 'playwright', 'test', '--config=tests/playwright.config.ts'], 'E2E Tests');
  
  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
  log(`\n${'#'.repeat(80)}`);
  log(`VERIFICATION CYCLE #${runNumber} COMPLETED in ${duration} minutes`);
  log(`${'#'.repeat(80)}\n`);
  
  runNumber++;
}

async function main() {
  log('🚀 Starting 3-hour automated verification loop...');
  log(`End time: ${new Date(endAt).toISOString()}`);
  log(`Current time: ${new Date().toISOString()}\n`);
  
  try {
    while (Date.now() < endAt) {
      const remainingMs = endAt - Date.now();
      const remainingMins = Math.floor(remainingMs / 1000 / 60);
      log(`⏱️  Time remaining: ${remainingMins} minutes\n`);
      
      await runVerificationCycle();
      
      // Brief pause between cycles
      if (Date.now() < endAt) {
        log('⏸️  Pausing 30 seconds before next cycle...\n');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    
    log('\n' + '🎉'.repeat(40));
    log('✅ 3-HOUR VERIFICATION LOOP COMPLETED SUCCESSFULLY');
    log('🎉'.repeat(40) + '\n');
    log(`Total verification cycles completed: ${runNumber - 1}`);
    log(`Check playwright-report/index.html for detailed test results`);
    
  } catch (error) {
    log(`\n❌ Fatal error in loop runner: ${error.message}`);
    log(error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n⚠️  Received SIGINT - shutting down gracefully...');
  log(`Completed ${runNumber - 1} verification cycles before shutdown`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n⚠️  Received SIGTERM - shutting down gracefully...');
  log(`Completed ${runNumber - 1} verification cycles before shutdown`);
  process.exit(0);
});

main().catch((err) => {
  log(`\n💥 Unhandled error: ${err.message}`);
  log(err.stack);
  process.exit(1);
});
