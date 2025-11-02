#!/usr/bin/env node
// @ts-nocheck

/**
 * Stop Dev Server (Cross-Platform)
 * Kills dev server process on specified port using kill-port package
 * Supports PID file-based stopping for fixzit-agent
 * Works on Windows, Linux, and macOS
 */

const killPort = require('kill-port');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv[2] || '3000', 10);
const PID_FILE = path.join('.agent-cache', 'dev.pid');

async function stopDevServer() {
  // Check for PID file first (for fixzit-agent)
  if (fs.existsSync(PID_FILE)) {
    try {
      const pid = Number(fs.readFileSync(PID_FILE, 'utf8'));
      console.log(`🛑 Stopping dev server (pid ${pid} from ${PID_FILE})...`);
      process.kill(pid);
      fs.unlinkSync(PID_FILE);
      console.log(`✅ Stopped dev server (pid ${pid}).`);
      return;
    } catch (e) {
      console.log(`⚠️  Could not stop pid from file: ${e.message}`);
      // Fall through to port-based kill
    }
  }

  // Validate that PORT is a number
  if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
    console.error(`❌ Invalid port: ${PORT}. Port must be a number between 1-65535.`);
    process.exit(1);
  }

  console.log(`🛑 Stopping dev server on port ${PORT}...`);
  
  try {
    // Kill process using the port (cross-platform)
    await killPort(PORT, 'tcp');
    console.log(`✅ Dev server stopped on port ${PORT}`);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    // kill-port throws if no process found, which is not an error
    if (err.message && err.message.includes('No process running')) {
      console.log(`⚠️  No process found on port ${PORT}`);
    } else {
      console.error(`❌ Failed to stop dev server: ${err.message || 'Unknown error'}`);
      process.exit(1);
    }
  }
}

stopDevServer();
