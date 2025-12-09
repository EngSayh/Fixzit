#!/usr/bin/env node
/**
 * Memory Selfcheck - AI Memory System
 * 
 * Verifies the AI memory system is properly configured and functioning.
 * Checks environment, file structure, and validates existing memory.
 * 
 * Usage: node tools/memory-selfcheck.js [--fix]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  fix: process.argv.includes('--fix'),
  memoryDir: 'ai-memory',
  requiredDirs: [
    'ai-memory',
    'ai-memory/batches',
    'ai-memory/outputs',
    'ai-memory/backups',
  ],
  requiredFiles: [
    { path: 'tools/smart-chunker.js', description: 'Batch creation script' },
    { path: 'tools/merge-memory.js', description: 'Memory merge script' },
    { path: 'tools/memory-selfcheck.js', description: 'This selfcheck script' },
  ],
  recommendedFiles: [
    { path: '.github/copilot-instructions.md', description: 'Copilot agent instructions' },
    { path: 'AGENTS.md', description: 'Agent documentation' },
    { path: '.vscode/tasks.json', description: 'VS Code tasks' },
  ],
};

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
  fixed: 0,
};

/**
 * Log check result
 */
function logCheck(status, message, details = null) {
  const icons = {
    pass: '✅',
    fail: '❌',
    warn: '⚠️',
    fix: '🔧',
    info: 'ℹ️',
  };

  console.log(`${icons[status]} ${message}`);
  if (details) {
    console.log(`   ${details}`);
  }

  if (status === 'pass') checks.passed++;
  if (status === 'fail') checks.failed++;
  if (status === 'warn') checks.warnings++;
  if (status === 'fix') checks.fixed++;
}

/**
 * Check if git is available
 */
function checkGit() {
  try {
    execSync('git --version', { stdio: 'pipe' });
    logCheck('pass', 'Git is available');
    return true;
  } catch {
    logCheck('fail', 'Git is not available');
    return false;
  }
}

/**
 * Check if in a git repository
 */
function checkGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
    logCheck('pass', 'Running in a git repository');
    return true;
  } catch {
    logCheck('fail', 'Not in a git repository');
    return false;
  }
}

/**
 * Check Node.js version
 */
function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);
  
  if (major >= 18) {
    logCheck('pass', `Node.js version ${version} (>= 18 required)`);
    return true;
  } else {
    logCheck('warn', `Node.js version ${version} (>= 18 recommended)`);
    return false;
  }
}

/**
 * Check required directories
 */
function checkDirectories() {
  let allPresent = true;

  CONFIG.requiredDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    
    if (fs.existsSync(dirPath)) {
      logCheck('pass', `Directory exists: ${dir}`);
    } else {
      if (CONFIG.fix) {
        fs.mkdirSync(dirPath, { recursive: true });
        logCheck('fix', `Created directory: ${dir}`);
      } else {
        logCheck('fail', `Missing directory: ${dir}`, 'Run with --fix to create');
        allPresent = false;
      }
    }
  });

  return allPresent;
}

/**
 * Check required files
 */
function checkRequiredFiles() {
  let allPresent = true;

  CONFIG.requiredFiles.forEach(({ path: filePath, description }) => {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (fs.existsSync(fullPath)) {
      logCheck('pass', `Required file exists: ${filePath}`);
    } else {
      logCheck('fail', `Missing required file: ${filePath}`, description);
      allPresent = false;
    }
  });

  return allPresent;
}

/**
 * Check recommended files
 */
function checkRecommendedFiles() {
  CONFIG.recommendedFiles.forEach(({ path: filePath, description }) => {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (fs.existsSync(fullPath)) {
      logCheck('pass', `Recommended file exists: ${filePath}`);
    } else {
      logCheck('warn', `Missing recommended file: ${filePath}`, description);
    }
  });
}

/**
 * Check master index integrity
 */
function checkMasterIndex() {
  const masterPath = path.join(process.cwd(), 'ai-memory/master-index.json');
  
  if (!fs.existsSync(masterPath)) {
    if (CONFIG.fix) {
      const initialIndex = {
        version: '1.0.0',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        entries: [],
        metadata: {
          totalEntries: 0,
          lastMerge: null,
          sources: [],
        },
      };
      fs.writeFileSync(masterPath, JSON.stringify(initialIndex, null, 2));
      logCheck('fix', 'Created initial master-index.json');
    } else {
      logCheck('info', 'Master index not yet created (this is normal for new setup)');
    }
    return;
  }

  try {
    const content = fs.readFileSync(masterPath, 'utf-8');
    const index = JSON.parse(content);

    // Validate structure
    if (!index.version) {
      logCheck('warn', 'Master index missing version field');
    }
    if (!index.entries) {
      logCheck('fail', 'Master index missing entries array');
      return;
    }
    if (!Array.isArray(index.entries)) {
      logCheck('fail', 'Master index entries is not an array');
      return;
    }

    logCheck('pass', `Master index valid: ${index.entries.length} entries`);

    // Check for potential issues
    const duplicates = findDuplicateIds(index.entries);
    if (duplicates.length > 0) {
      logCheck('warn', `Found ${duplicates.length} duplicate IDs in master index`);
    }

  } catch (error) {
    logCheck('fail', 'Master index is invalid JSON', error.message);
  }
}

/**
 * Find duplicate IDs
 */
function findDuplicateIds(entries) {
  const ids = new Map();
  const duplicates = [];

  entries.forEach((entry, index) => {
    if (entry.id) {
      if (ids.has(entry.id)) {
        duplicates.push({ id: entry.id, indices: [ids.get(entry.id), index] });
      }
      ids.set(entry.id, index);
    }
  });

  return duplicates;
}

/**
 * Check VS Code tasks configuration
 */
function checkVSCodeTasks() {
  const tasksPath = path.join(process.cwd(), '.vscode/tasks.json');
  
  if (!fs.existsSync(tasksPath)) {
    logCheck('warn', 'VS Code tasks.json not found');
    return;
  }

  try {
    const content = fs.readFileSync(tasksPath, 'utf-8');
    const tasks = JSON.parse(content);
    
    const requiredTasks = ['Chunk Memory', 'Merge Memory', 'Memory Selfcheck'];
    const taskLabels = (tasks.tasks || []).map(t => t.label);
    
    requiredTasks.forEach(taskName => {
      const found = taskLabels.some(label => 
        label.toLowerCase().includes(taskName.toLowerCase()) ||
        label.toLowerCase().includes(taskName.toLowerCase().replace(' ', '-'))
      );
      
      if (found) {
        logCheck('pass', `VS Code task found: ${taskName}`);
      } else {
        logCheck('warn', `VS Code task missing: ${taskName}`);
      }
    });

  } catch (error) {
    logCheck('warn', 'Could not parse VS Code tasks.json', error.message);
  }
}

/**
 * Check copilot instructions for memory references
 */
function checkCopilotInstructions() {
  const copilotPath = path.join(process.cwd(), '.github/copilot-instructions.md');
  
  if (!fs.existsSync(copilotPath)) {
    logCheck('warn', 'Copilot instructions not found');
    return;
  }

  const content = fs.readFileSync(copilotPath, 'utf-8').toLowerCase();
  
  const memoryKeywords = [
    'ai-memory',
    'master-index',
    'smart-chunker',
    'merge-memory',
    'memory pipeline',
  ];

  const found = memoryKeywords.filter(kw => content.includes(kw.toLowerCase()));
  
  if (found.length >= 3) {
    logCheck('pass', 'Copilot instructions include memory system references');
  } else if (found.length > 0) {
    logCheck('warn', `Copilot instructions partially configured (${found.length}/5 keywords)`);
  } else {
    logCheck('warn', 'Copilot instructions do not reference memory system');
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`   ✅ Passed:   ${checks.passed}`);
  console.log(`   ❌ Failed:   ${checks.failed}`);
  console.log(`   ⚠️  Warnings: ${checks.warnings}`);
  if (checks.fixed > 0) {
    console.log(`   🔧 Fixed:    ${checks.fixed}`);
  }

  if (checks.failed === 0) {
    console.log('\n🎉 All critical checks passed!');
    if (checks.warnings > 0) {
      console.log('   Consider addressing warnings for optimal setup.');
    }
    return 0;
  } else {
    console.log('\n❌ Some critical checks failed.');
    console.log('   Run with --fix to auto-fix what can be fixed.');
    return 1;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🧠 Memory Selfcheck - AI Memory System');
  console.log('=======================================\n');

  if (CONFIG.fix) {
    console.log('🔧 FIX MODE ENABLED\n');
  }

  // Environment checks
  console.log('📋 Environment Checks:');
  checkGit();
  checkGitRepo();
  checkNodeVersion();

  // Structure checks
  console.log('\n📁 Directory Structure:');
  checkDirectories();

  // File checks
  console.log('\n📄 Required Files:');
  checkRequiredFiles();

  console.log('\n📄 Recommended Files:');
  checkRecommendedFiles();

  // Master index check
  console.log('\n🗄️ Master Index:');
  checkMasterIndex();

  // Integration checks
  console.log('\n🔌 Integrations:');
  checkVSCodeTasks();
  checkCopilotInstructions();

  // Summary
  const exitCode = printSummary();
  process.exit(exitCode);
}

main();
