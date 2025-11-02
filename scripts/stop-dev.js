#!/usr/bin/env node
// @ts-check

/**
 * Stop Dev Server
 * Kills dev server process on specified port
 */

const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile);

const PORT = process.argv[2] || 3000;

async function stopDevServer() {
  // Validate that PORT is a number
  if (!/^\d+$/.test(String(PORT))) {
    console.error(`❌ Invalid port: ${PORT}. Port must be a number.`);
    process.exit(1);
  }

  console.log(`🛑 Stopping dev server on port ${PORT}...`);
  
  try {
    // Find process using port
    const { stdout } = await execFilePromise('lsof', ['-ti', String(PORT)]);
    const pid = stdout.trim();
    
    if (pid) {
      console.log(`Found process ${pid} on port ${PORT}`);
      await execFilePromise('kill', ['-9', pid]);
      console.log(`✅ Dev server stopped (PID ${pid})`);
    } else {
      console.log(`⚠️  No process found on port ${PORT}`);
    }
  } catch (error) {
    if (error.message.includes('No such process')) {
      console.log(`⚠️  No process found on port ${PORT}`);
    } else {
      console.error(`❌ Failed to stop dev server: ${error.message}`);
      process.exit(1);
    }
  }
}

stopDevServer();
