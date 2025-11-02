#!/usr/bin/env node
// @ts-check

/**
 * Stop Dev Server (Cross-Platform)
 * Kills dev server process on specified port using kill-port package
 * Works on Windows, Linux, and macOS
 */

const killPort = require('kill-port');

const PORT = parseInt(process.argv[2] || '3000', 10);

async function stopDevServer() {
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
    const err = error;
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
