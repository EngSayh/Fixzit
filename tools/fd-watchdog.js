#!/usr/bin/env node
/**
 * File Descriptor Watchdog for Multi-Agent Environments
 * Prevents EMFILE errors by cleaning stale sockets and monitoring fd usage
 * 
 * Usage:
 *   node tools/fd-watchdog.js          # Run once
 *   node tools/fd-watchdog.js --watch  # Run continuously (every 30s)
 *   node tools/fd-watchdog.js --daemon # Background daemon mode
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG = {
  // Cleanup interval in ms (30 seconds)
  interval: 30_000,
  // Max vitest processes allowed concurrently
  maxVitestProcesses: 2,
  // Socket age threshold in minutes before cleanup
  socketAgeMinutes: 5,
  // Warning threshold for open files per node process
  openFilesWarning: 5000,
  // Temp directories to clean
  tempPatterns: [
    '/var/folders/*/*/T/node-cdp.*',
    '/var/folders/*/*/T/vitest-*',
    `${os.tmpdir()}/node-cdp.*`,
    `${os.tmpdir()}/vitest-*`,
  ],
};

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function log(level, message) {
  const timestamp = new Date().toISOString().slice(11, 19);
  const color = { info: colors.blue, warn: colors.yellow, error: colors.red, success: colors.green }[level] || colors.gray;
  console.log(`${colors.gray}[${timestamp}]${colors.reset} ${color}[${level.toUpperCase()}]${colors.reset} ${message}`);
}

function exec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

function getStaleSocketCount() {
  let count = 0;
  for (const pattern of CONFIG.tempPatterns) {
    const result = exec(`ls ${pattern} 2>/dev/null | wc -l`);
    count += parseInt(result) || 0;
  }
  return count;
}

function cleanStaleSockets() {
  let cleaned = 0;
  for (const pattern of CONFIG.tempPatterns) {
    const result = exec(`rm -f ${pattern} 2>/dev/null && echo "done"`);
    if (result === 'done') cleaned++;
  }
  return cleaned;
}

function getVitestProcesses() {
  const result = exec('ps aux | grep -E "node.*vitest" | grep -v grep');
  if (!result) return [];
  
  return result.split('\n').map(line => {
    const parts = line.trim().split(/\s+/);
    return {
      pid: parts[1],
      cpu: parseFloat(parts[2]),
      mem: parseFloat(parts[3]),
      command: parts.slice(10).join(' '),
    };
  }).filter(p => p.pid);
}

function getNodeOpenFiles() {
  const result = exec('lsof -c node 2>/dev/null | wc -l');
  return parseInt(result) || 0;
}

function killExcessVitestProcesses(processes) {
  if (processes.length <= CONFIG.maxVitestProcesses) return 0;
  
  // Sort by CPU usage (ascending) and kill lowest CPU ones first (likely idle/orphaned)
  const sorted = [...processes].sort((a, b) => a.cpu - b.cpu);
  const toKill = sorted.slice(0, processes.length - CONFIG.maxVitestProcesses);
  
  let killed = 0;
  for (const proc of toKill) {
    try {
      execSync(`kill ${proc.pid} 2>/dev/null`);
      killed++;
      log('warn', `Killed orphaned vitest process PID ${proc.pid} (CPU: ${proc.cpu}%)`);
    } catch {
      // Process may have already exited
    }
  }
  return killed;
}

function runCleanup() {
  const staleSockets = getStaleSocketCount();
  const vitestProcs = getVitestProcesses();
  const openFiles = getNodeOpenFiles();
  
  let actions = [];
  
  // Clean stale sockets
  if (staleSockets > 10) {
    cleanStaleSockets();
    actions.push(`cleaned ${staleSockets} stale sockets`);
  }
  
  // Kill excess vitest processes
  if (vitestProcs.length > CONFIG.maxVitestProcesses) {
    const killed = killExcessVitestProcesses(vitestProcs);
    if (killed > 0) {
      actions.push(`killed ${killed} excess vitest processes`);
    }
  }
  
  // Warn about high open file count
  if (openFiles > CONFIG.openFilesWarning) {
    log('warn', `High open file count: ${openFiles} (threshold: ${CONFIG.openFilesWarning})`);
  }
  
  return {
    staleSockets,
    vitestProcs: vitestProcs.length,
    openFiles,
    actions,
  };
}

function printStatus(status) {
  console.log('');
  console.log(`${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║${colors.reset}    FD Watchdog Status Report           ${colors.blue}║${colors.reset}`);
  console.log(`${colors.blue}╠════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.blue}║${colors.reset}  Stale sockets:    ${String(status.staleSockets).padStart(6)}              ${colors.blue}║${colors.reset}`);
  console.log(`${colors.blue}║${colors.reset}  Vitest processes: ${String(status.vitestProcs).padStart(6)}              ${colors.blue}║${colors.reset}`);
  console.log(`${colors.blue}║${colors.reset}  Open files (node):${String(status.openFiles).padStart(6)}              ${colors.blue}║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);
  
  if (status.actions.length > 0) {
    log('success', `Actions: ${status.actions.join(', ')}`);
  } else {
    log('info', 'System healthy, no action needed');
  }
  console.log('');
}

function runOnce() {
  log('info', 'Running single cleanup...');
  const status = runCleanup();
  printStatus(status);
  process.exit(0);
}

function runWatch() {
  log('info', `Starting watchdog (interval: ${CONFIG.interval / 1000}s, max vitest: ${CONFIG.maxVitestProcesses})`);
  
  // Initial cleanup
  const initial = runCleanup();
  printStatus(initial);
  
  // Periodic cleanup
  setInterval(() => {
    const status = runCleanup();
    if (status.actions.length > 0) {
      log('success', `Actions: ${status.actions.join(', ')}`);
    }
  }, CONFIG.interval);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('info', 'Shutting down watchdog...');
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    log('info', 'Shutting down watchdog...');
    process.exit(0);
  });
}

function runDaemon() {
  const logFile = path.join(os.tmpdir(), 'fd-watchdog.log');
  const pidFile = path.join(os.tmpdir(), 'fd-watchdog.pid');
  
  // Check if already running
  if (fs.existsSync(pidFile)) {
    const existingPid = fs.readFileSync(pidFile, 'utf8').trim();
    const isRunning = exec(`ps -p ${existingPid} -o pid= 2>/dev/null`);
    if (isRunning) {
      log('warn', `Watchdog already running (PID: ${existingPid})`);
      process.exit(1);
    }
  }
  
  // Spawn detached process
  const child = spawn(process.execPath, [__filename, '--watch'], {
    detached: true,
    stdio: ['ignore', fs.openSync(logFile, 'a'), fs.openSync(logFile, 'a')],
  });
  
  fs.writeFileSync(pidFile, String(child.pid));
  child.unref();
  
  log('success', `Daemon started (PID: ${child.pid})`);
  log('info', `Log file: ${logFile}`);
  log('info', `PID file: ${pidFile}`);
  log('info', 'To stop: kill $(cat /tmp/fd-watchdog.pid)');
  process.exit(0);
}

// CLI
const args = process.argv.slice(2);
if (args.includes('--daemon') || args.includes('-d')) {
  runDaemon();
} else if (args.includes('--watch') || args.includes('-w')) {
  runWatch();
} else if (args.includes('--help') || args.includes('-h')) {
  console.log(`
FD Watchdog - Prevents EMFILE errors in multi-agent environments

Usage:
  node tools/fd-watchdog.js              Run once and exit
  node tools/fd-watchdog.js --watch      Run continuously (foreground)
  node tools/fd-watchdog.js --daemon     Run as background daemon
  node tools/fd-watchdog.js --help       Show this help

To stop daemon:
  kill $(cat /tmp/fd-watchdog.pid)
`);
  process.exit(0);
} else {
  runOnce();
}
