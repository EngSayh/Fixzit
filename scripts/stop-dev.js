#!/usr/bin/env node
// @ts-check

/**
 * Stop Dev Server
 * Kills dev server process on specified port
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const PORT = process.argv[2] || 3000;

async function stopDevServer() {
  console.log(`🛑 Stopping dev server on port ${PORT}...`);
  
  try {
    // Find process using port
    const { stdout } = await execPromise(`lsof -ti:${PORT}`);
    const pid = stdout.trim();
    
    if (pid) {
      console.log(`Found process ${pid} on port ${PORT}`);
      await execPromise(`kill -9 ${pid}`);
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
