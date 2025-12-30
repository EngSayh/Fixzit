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

// Check for WSL availability on Windows (must have a distribution installed)
async function hasWSL() {
  if (!isWindows) return false;
  
  return new Promise((resolve) => {
    const proc = spawn('wsl', ['--list', '--quiet'], { 
      stdio: 'pipe',
      shell: true 
    });
    let stdout = '';
    proc.stdout?.on('data', (data) => { stdout += data.toString(); });
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => {
      // Check if there's actually a distribution listed
      const hasDistro = code === 0 && stdout.trim().length > 0;
      resolve(hasDistro);
    });
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
