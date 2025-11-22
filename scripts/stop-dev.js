#!/usr/bin/env node
/**
 * Stop Development Server Utility
 * 
 * Gracefully stops the background development server started by fixzit-agent:
 * 1. Reads PID from .agent-cache/dev.pid
 * 2. Sends SIGTERM (graceful shutdown)
 * 3. Waits 5 seconds
 * 4. Sends SIGKILL (force kill) if still running
 * 
 * Usage:
 *   node scripts/stop-dev.js
 *   pnpm run fixzit:agent:stop
 */

const fs = require('fs');
const path = require('path');

const PID_FILE = path.join(process.cwd(), '.agent-cache', 'dev.pid');

async function stopDevServer() {
  console.log('🛑 Attempting to stop development server...');

  if (!fs.existsSync(PID_FILE)) {
    console.log('ℹ️  No PID file found. Development server may not be running.');
    return;
  }

  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);

    if (isNaN(pid)) {
      console.error('❌ Invalid PID in file. Removing stale PID file.');
      fs.unlinkSync(PID_FILE);
      return;
    }

    console.log(`📍 Found PID: ${pid}`);

    // Check if process exists
    try {
      process.kill(pid, 0); // Signal 0 checks if process exists without killing
      console.log('✅ Process is running. Sending SIGTERM...');
    } catch (error) {
      console.log('ℹ️  Process not found. Removing stale PID file.', error?.message || '');
      fs.unlinkSync(PID_FILE);
      return;
    }

    // Send SIGTERM (graceful shutdown)
    try {
      process.kill(pid, 'SIGTERM');
      console.log('⏳ Waiting 5 seconds for graceful shutdown...');

      await sleep(5000);

      // Check if process is still running
      try {
        process.kill(pid, 0);
        console.log('⚠️  Process still running. Sending SIGKILL...');
        process.kill(pid, 'SIGKILL');
        await sleep(1000);
      } catch (_error) {
        console.log('✅ Process terminated gracefully.');
      }
    } catch (error) {
      if (error.code === 'ESRCH') {
        console.log('✅ Process already terminated.');
      } else {
        throw error;
      }
    }

    // Clean up PID file
    fs.unlinkSync(PID_FILE);
    console.log('🧹 Cleaned up PID file.');
    console.log('✅ Development server stopped successfully.');

  } catch (error) {
    console.error('❌ Failed to stop development server:', error.message);
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

stopDevServer();
