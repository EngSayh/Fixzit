#!/usr/bin/env node
/**
 * Cross-platform runner for Playwright tests
 * Detects OS and runs appropriate script (bash or PowerShell)
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const isWindows = os.platform() === 'win32';
const scriptsDir = path.join(__dirname);
const args = process.argv.slice(2);

// Check for WSL availability on Windows
async function hasWSL() {
  if (!isWindows) return false;
  
  return new Promise((resolve) => {
    const proc = spawn('wsl', ['--status'], { 
      stdio: 'pipe',
      shell: true 
    });
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

async function main() {
  let cmd, cmdArgs;

  if (isWindows) {
    // Try WSL first, fall back to PowerShell
    const wslAvailable = await hasWSL();
    
    if (wslAvailable) {
      cmd = 'bash';
      cmdArgs = [path.join(scriptsDir, 'run-playwright.sh'), ...args];
    } else {
      cmd = 'powershell';
      cmdArgs = [
        '-ExecutionPolicy', 'Bypass',
        '-File', path.join(scriptsDir, 'run-playwright.ps1'),
        ...args
      ];
    }
  } else {
    // Unix-like systems use bash directly
    cmd = 'bash';
    cmdArgs = [path.join(scriptsDir, 'run-playwright.sh'), ...args];
  }

  console.log(`Running Playwright with: ${cmd} ${cmdArgs[0]}`);

  const proc = spawn(cmd, cmdArgs, {
    stdio: 'inherit',
    shell: isWindows,
    cwd: path.join(scriptsDir, '..')
  });

  proc.on('error', (err) => {
    console.error('Failed to start Playwright:', err.message);
    process.exit(1);
  });

  proc.on('close', (code) => {
    process.exit(code || 0);
  });
}

main();
