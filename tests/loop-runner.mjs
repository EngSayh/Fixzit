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
let hasFailures = false; // Track if any command failed during the loop
const logFile = CONFIG.logFile;

// Ensure log directory exists
try {
  mkdirSync(dirname(logFile), { recursive: true });
} catch (err) {
  console.error(`Failed to create log directory: ${err.message}`);
}

/**
 * Log a message to console and file
 * @param {string} message - The message to log
 * @param {boolean} isError - Whether this is an error message
 */
function logMessage(message, isError = false) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}\n`;
  if (isError) {
    console.error(message);
  } else {
    console.log(message);
  }
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
    logMessage(`\n${'='.repeat(80)}\n[${step}] ${label}\nCommand: ${cmd} ${args.join(' ')}\n${'='.repeat(80)}`);

    // CI=1 forces non-interactive mode for tools like Playwright
    const proc = spawn(cmd, args, {
      stdio: 'pipe',
      shell: false,
      env: { ...process.env, CI: '1' },
    });

    proc.stdout.on('data', (data) => logMessage(data.toString()));
    proc.stderr.on('data', (data) => logMessage(data.toString(), true));

    proc.on('close', (code) => {
      if (code === 0) {
        logMessage(`✓ ${label} completed successfully`);
        resolve(code);
      } else {
        const errMsg = `✗ ${label} failed with exit code ${code}`;
        logMessage(errMsg, true);
        reject(new Error(errMsg));
      }
    });

    proc.on('error', (err) => {
      logMessage(`✗ ${label} error: ${err.message}`, true);
      reject(err);
    });
  });
}

async function runVerificationCycle() {
  const startTime = Date.now();
  logMessage(`\n${'#'.repeat(80)}`);
  logMessage(`VERIFICATION CYCLE #${runNumber} STARTED`);
  logMessage(`${'#'.repeat(80)}\n`);
  
  let cycleSuccess = true;

  for (const { cmd, args, label, step } of CONFIG.commands) {
    logMessage(`\n📋 Step ${step}: ${label}...`);
    try {
      await executeCommand(cmd, args, label, step);
    } catch (err) {
      cycleSuccess = false;
      hasFailures = true; // Track that at least one failure occurred
      logMessage(`Continuing to next step despite failure in: ${label}`, true);
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
  logMessage(`\n${'#'.repeat(80)}`);
  if (cycleSuccess) {
    logMessage(`✓ VERIFICATION CYCLE #${runNumber} COMPLETED SUCCESSFULLY in ${duration} minutes`);
  } else {
    logMessage(`✗ VERIFICATION CYCLE #${runNumber} COMPLETED WITH FAILURES in ${duration} minutes`);
  }
  logMessage(`${'#'.repeat(80)}\n`);
  
  runNumber++;
}

async function main() {
  // Clear log file at start to prevent unbounded growth
  try {
    mkdirSync(dirname(logFile), { recursive: true });
    writeFileSync(logFile, '', 'utf8');
    logMessage('🧹 Log file cleared at start of loop');
  } catch (err) {
    console.error(`Failed to clear log file: ${err.message}`);
  }

  logMessage('🚀 Starting automated verification loop...');
  logMessage(`Duration: ${(CONFIG.durationMs / 1000 / 60).toFixed(0)} minutes`);
  logMessage(`End time: ${new Date(endAt).toISOString()}`);
  logMessage(`Current time: ${new Date().toISOString()}\n`);
  
  try {
    while (Date.now() < endAt) {
      const remainingMs = endAt - Date.now();
      const remainingMins = Math.floor(remainingMs / 1000 / 60);
      logMessage(`⏱️  Time remaining: ${remainingMins} minutes\n`);
      
      await runVerificationCycle();
      
      // Brief pause between cycles
      if (Date.now() < endAt) {
        logMessage(`⏸️  Pausing ${CONFIG.pauseBetweenCycles / 1000} seconds before next cycle...\n`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.pauseBetweenCycles));
      }
    }
    
    logMessage('\n' + '🎉'.repeat(40));
    logMessage('✅ VERIFICATION LOOP COMPLETED');
    logMessage('🎉'.repeat(40) + '\n');
    logMessage(`Total verification cycles completed: ${runNumber - 1}`);
    logMessage(`Check playwright-report/index.html for detailed test results`);
    
  } catch (error) {
    logMessage(`\n❌ Fatal error in loop runner: ${error.message}`);
    logMessage(error.stack);
    anyFailures = true;
  }

  // Exit with code 1 if any failures occurred during the loop
  if (hasFailures) {
    logMessage('\n✗ Exiting with code 1 - failures detected during verification loop', true);
    process.exit(1);
  } else {
    logMessage('\n✓ Exiting with code 0 - all verification cycles passed');
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logMessage('\n⚠️  Received SIGINT - shutting down gracefully...');
  logMessage(`Completed ${runNumber - 1} verification cycles before shutdown`);
  process.exit(hasFailures ? 1 : 0);
});

process.on('SIGTERM', () => {
  logMessage('\n⚠️  Received SIGTERM - shutting down gracefully...');
  logMessage(`Completed ${runNumber - 1} verification cycles before shutdown`);
  process.exit(hasFailures ? 1 : 0);
});

main().catch((err) => {
  logMessage(`\n💥 Unhandled error: ${err.message}`);
  logMessage(err.stack);
  process.exit(1);
});
