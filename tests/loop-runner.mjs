import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

// Configuration - can be overridden via environment variables
const CONFIG = {
  durationMs: parseInt(process.env.LOOP_DURATION_MS || (3 * 60 * 60 * 1000)), // 3 hours default
  pauseBetweenCycles: parseInt(process.env.LOOP_PAUSE_MS || 30000), // 30 seconds
  logFile: process.env.LOOP_LOG_FILE || 'tests/loop-runner.log',
  commands: [
    { cmd: 'pnpm', args: ['typecheck'], label: 'TypeScript Check', step: '1/4' },
    { cmd: 'pnpm', args: ['lint', '--max-warnings=0'], label: 'ESLint', step: '2/4' },
    { cmd: 'node', args: ['tests/i18n-scan.mjs'], label: 'i18n Scanner', step: '3/4' },
    { cmd: 'pnpm', args: ['exec', 'playwright', 'test', '--config=tests/playwright.config.ts'], label: 'E2E Tests', step: '4/4' },
  ],
};

const endAt = Date.now() + CONFIG.durationMs;
let runNumber = 1;
let anyFailures = false; // Track if any command failed during the loop
const logFile = CONFIG.logFile;

// Ensure log directory exists
try {
  mkdirSync(dirname(logFile), { recursive: true });
} catch (err) {
  console.error(`Failed to create log directory: ${err.message}`);
}

function log(message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    writeFileSync(logFile, entry, { flag: 'a' });
  } catch (err) {
    console.error(`Failed to write to ${logFile}: ${err.message}`);
  }
}

/**
 * Runs a command and logs its output
 * Rejects the promise if the command exits with non-zero code
 */
function executeCommand(cmd, args, label, step) {
  return new Promise((resolve, reject) => {
    log(`\n${'='.repeat(80)}\n[${step}] ${label}\nCommand: ${cmd} ${args.join(' ')}\n${'='.repeat(80)}`);

    // CI=1 forces non-interactive mode for tools like Playwright
    const proc = spawn(cmd, args, {
      stdio: 'pipe',
      shell: false,
      env: { ...process.env, CI: '1' },
    });

    proc.stdout.on('data', (data) => log(data.toString()));
    proc.stderr.on('data', (data) => log(data.toString(), true));

    proc.on('close', (code) => {
      if (code === 0) {
        log(`✓ ${label} completed successfully`);
        resolve(code);
      } else {
        const errMsg = `✗ ${label} failed with exit code ${code}`;
        log(errMsg, true);
        reject(new Error(errMsg));
      }
    });

    proc.on('error', (err) => {
      log(`✗ ${label} error: ${err.message}`, true);
      reject(err);
    });
  });
}

async function runVerificationCycle() {
  const startTime = Date.now();
  log(`\n${'#'.repeat(80)}`);
  log(`VERIFICATION CYCLE #${runNumber} STARTED`);
  log(`${'#'.repeat(80)}\n`);
  
  let cycleSuccess = true;

  for (const { cmd, args, label, step } of CONFIG.commands) {
    log(`\n📋 Step ${step}: ${label}...`);
    try {
      await executeCommand(cmd, args, label, step);
    } catch (err) {
      cycleSuccess = false;
      anyFailures = true; // Track that at least one failure occurred
      log(`Continuing to next step despite failure in: ${label}`, true);
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
  log(`\n${'#'.repeat(80)}`);
  if (cycleSuccess) {
    log(`✓ VERIFICATION CYCLE #${runNumber} COMPLETED SUCCESSFULLY in ${duration} minutes`);
  } else {
    log(`✗ VERIFICATION CYCLE #${runNumber} COMPLETED WITH FAILURES in ${duration} minutes`);
  }
  log(`${'#'.repeat(80)}\n`);
  
  runNumber++;
}

async function main() {
  // Clear log file at start to prevent unbounded growth
  try {
    mkdirSync(dirname(logFile), { recursive: true });
    writeFileSync(logFile, '', 'utf8');
    log('🧹 Log file cleared at start of loop');
  } catch (err) {
    console.error(`Failed to clear log file: ${err.message}`);
  }

  log('🚀 Starting automated verification loop...');
  log(`Duration: ${(CONFIG.durationMs / 1000 / 60).toFixed(0)} minutes`);
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
        log(`⏸️  Pausing ${CONFIG.pauseBetweenCycles / 1000} seconds before next cycle...\n`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.pauseBetweenCycles));
      }
    }
    
    log('\n' + '🎉'.repeat(40));
    log('✅ VERIFICATION LOOP COMPLETED');
    log('🎉'.repeat(40) + '\n');
    log(`Total verification cycles completed: ${runNumber - 1}`);
    log(`Check playwright-report/index.html for detailed test results`);
    
  } catch (error) {
    log(`\n❌ Fatal error in loop runner: ${error.message}`);
    log(error.stack);
    anyFailures = true;
  }

  // Exit with code 1 if any failures occurred during the loop
  if (anyFailures) {
    log('\n✗ Exiting with code 1 - failures detected during verification loop', true);
    process.exit(1);
  } else {
    log('\n✓ Exiting with code 0 - all verification cycles passed');
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n⚠️  Received SIGINT - shutting down gracefully...');
  log(`Completed ${runNumber - 1} verification cycles before shutdown`);
  process.exit(anyFailures ? 1 : 0);
});

process.on('SIGTERM', () => {
  log('\n⚠️  Received SIGTERM - shutting down gracefully...');
  log(`Completed ${runNumber - 1} verification cycles before shutdown`);
  process.exit(anyFailures ? 1 : 0);
});

main().catch((err) => {
  log(`\n💥 Unhandled error: ${err.message}`);
  log(err.stack);
  process.exit(1);
});
