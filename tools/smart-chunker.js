#!/usr/bin/env node
/**
 * Smart Chunker - AI Memory System
 * 
 * Prepares repository content for AI memory processing.
 * Creates batches of files with 100k character limit per batch.
 * Outputs to ai-memory/batches/ for processing via Inline Chat.
 * 
 * Usage: node tools/smart-chunker.js [--max-chars=100000] [--exclude=pattern]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  maxCharsPerBatch: parseInt(process.env.CHUNK_MAX_CHARS || '100000', 10),
  outputDir: 'ai-memory/batches',
  excludePatterns: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
    'test-results',
    'playwright-report',
    '.pnpm',
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    '*.log',
    '*.map',
    '*.min.js',
    '*.min.css',
    'ai-memory/batches',
    'ai-memory/outputs',
    '_artifacts',
    'public/assets',
    '*.ico',
    '*.png',
    '*.jpg',
    '*.jpeg',
    '*.gif',
    '*.svg',
    '*.woff',
    '*.woff2',
    '*.ttf',
    '*.eot',
    '*.pdf',
  ],
  priorityPatterns: [
    // High priority - core business logic
    { pattern: /^(lib|server|domain|modules)\//, priority: 1 },
    // Medium priority - components and hooks
    { pattern: /^(components|hooks|contexts)\//, priority: 2 },
    // Configuration files
    { pattern: /^(config|configs)\//, priority: 2 },
    // App routes
    { pattern: /^app\//, priority: 3 },
    // Scripts and tools
    { pattern: /^(scripts|tools)\//, priority: 4 },
    // Tests
    { pattern: /^tests\//, priority: 5 },
    // Documentation
    { pattern: /\.(md|mdx)$/, priority: 6 },
  ],
};

// Parse command line arguments
const args = process.argv.slice(2);
args.forEach(arg => {
  if (arg.startsWith('--max-chars=')) {
    CONFIG.maxCharsPerBatch = parseInt(arg.split('=')[1], 10);
  }
  if (arg.startsWith('--exclude=')) {
    CONFIG.excludePatterns.push(arg.split('=')[1]);
  }
});

/**
 * Check if file should be excluded
 */
function shouldExclude(filePath) {
  return CONFIG.excludePatterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  });
}

/**
 * Get file priority for sorting
 */
function getFilePriority(filePath) {
  for (const { pattern, priority } of CONFIG.priorityPatterns) {
    if (pattern.test(filePath)) {
      return priority;
    }
  }
  return 10; // Default low priority
}

/**
 * Get all tracked files from git
 */
function getGitTrackedFiles() {
  try {
    const output = execSync('git ls-files', { encoding: 'utf-8' });
    return output.trim().split('\n').filter(Boolean);
  } catch (_error) {
    console.warn('git ls-files failed, falling back to recursive scan');
    return [];
  }
}

/**
 * Read file content safely
 */
function readFileSafe(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Skip binary files
    if (content.includes('\0')) {
      return null;
    }
    return content;
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Format file for batch output
 */
function formatFileForBatch(filePath, content) {
  const separator = '='.repeat(80);
  return `
${separator}
FILE: ${filePath}
${separator}
${content}
`;
}

/**
 * Create batches of files
 */
function createBatches(files) {
  const batches = [];
  let currentBatch = [];
  let currentSize = 0;

  // Sort files by priority
  const sortedFiles = files
    .map(file => ({ path: file, priority: getFilePriority(file) }))
    .sort((a, b) => a.priority - b.priority);

  for (const { path: filePath } of sortedFiles) {
    if (shouldExclude(filePath)) {
      continue;
    }

    const content = readFileSafe(filePath);
    if (!content) {
      continue;
    }

    const formattedContent = formatFileForBatch(filePath, content);
    const contentSize = formattedContent.length;

    // If single file exceeds max, put it in its own batch
    if (contentSize > CONFIG.maxCharsPerBatch) {
      console.warn(`Warning: ${filePath} exceeds max batch size (${contentSize} chars)`);
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentSize = 0;
      }
      batches.push([{ path: filePath, content: formattedContent }]);
      continue;
    }

    // Start new batch if current would exceed limit
    if (currentSize + contentSize > CONFIG.maxCharsPerBatch) {
      batches.push(currentBatch);
      currentBatch = [];
      currentSize = 0;
    }

    currentBatch.push({ path: filePath, content: formattedContent });
    currentSize += contentSize;
  }

  // Don't forget the last batch
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * Write batches to disk
 */
function writeBatches(batches) {
  // Ensure output directory exists
  const outputPath = path.join(process.cwd(), CONFIG.outputDir);
  fs.mkdirSync(outputPath, { recursive: true });

  // Clear existing batches
  const existingFiles = fs.readdirSync(outputPath);
  existingFiles.forEach(file => {
    if (file.startsWith('batch-')) {
      fs.unlinkSync(path.join(outputPath, file));
    }
  });

  const _timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const manifest = {
    created: new Date().toISOString(),
    totalBatches: batches.length,
    totalFiles: batches.reduce((acc, batch) => acc + batch.length, 0),
    maxCharsPerBatch: CONFIG.maxCharsPerBatch,
    batches: [],
  };

  batches.forEach((batch, index) => {
    const batchNum = String(index + 1).padStart(3, '0');
    const filename = `batch-${batchNum}.txt`;
    const filePath = path.join(outputPath, filename);

    const content = batch.map(f => f.content).join('\n');
    const fileList = batch.map(f => f.path);

    fs.writeFileSync(filePath, content);

    manifest.batches.push({
      filename,
      files: fileList,
      charCount: content.length,
      fileCount: batch.length,
    });

    console.log(`📦 Created ${filename}: ${batch.length} files, ${content.length} chars`);
  });

  // Write manifest
  const manifestPath = path.join(outputPath, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📋 Manifest written to ${manifestPath}`);

  return manifest;
}

/**
 * Main execution
 */
function main() {
  console.log('🧠 Smart Chunker - AI Memory System');
  console.log('====================================\n');
  console.log(`Max chars per batch: ${CONFIG.maxCharsPerBatch.toLocaleString()}`);

  const files = getGitTrackedFiles();
  console.log(`Found ${files.length} tracked files\n`);

  const batches = createBatches(files);
  console.log(`Created ${batches.length} batches\n`);

  const manifest = writeBatches(batches);

  console.log('\n✅ Chunking complete!');
  console.log(`   Total batches: ${manifest.totalBatches}`);
  console.log(`   Total files: ${manifest.totalFiles}`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Open each batch file in ai-memory/batches/`);
  console.log(`   2. Process with Inline Chat: "Analyze and extract knowledge"`);
  console.log(`   3. Save outputs to ai-memory/outputs/`);
  console.log(`   4. Run: node tools/merge-memory.js`);
}

main();
