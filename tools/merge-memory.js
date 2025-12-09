#!/usr/bin/env node
/**
 * Merge Memory - AI Memory System
 * 
 * Merges processed memory outputs into a single master-index.json.
 * Validates JSON, deduplicates entries, and maintains version history.
 * 
 * Usage: node tools/merge-memory.js [--dry-run] [--validate-only]
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  outputsDir: 'ai-memory/outputs',
  masterIndexPath: 'ai-memory/master-index.json',
  backupDir: 'ai-memory/backups',
  dryRun: process.argv.includes('--dry-run'),
  validateOnly: process.argv.includes('--validate-only'),
};

/**
 * Validate JSON structure
 */
function validateMemoryEntry(entry, filename) {
  const errors = [];
  
  // Required fields
  const requiredFields = ['id', 'type', 'content'];
  requiredFields.forEach(field => {
    if (!entry[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Valid types
  const validTypes = [
    'pattern',
    'convention',
    'architecture',
    'api',
    'component',
    'hook',
    'util',
    'model',
    'route',
    'config',
    'test',
    'documentation',
    'integration',
    'security',
    'performance',
    'i18n',
  ];
  
  if (entry.type && !validTypes.includes(entry.type)) {
    errors.push(`Invalid type: ${entry.type}. Valid types: ${validTypes.join(', ')}`);
  }

  // Content structure
  if (entry.content) {
    if (typeof entry.content === 'string' && entry.content.length < 10) {
      errors.push('Content too short (minimum 10 characters)');
    }
    if (typeof entry.content === 'object' && Object.keys(entry.content).length === 0) {
      errors.push('Content object is empty');
    }
  }

  return errors;
}

/**
 * Read and parse JSON file safely
 */
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Try to parse as JSON
    try {
      return { data: JSON.parse(content), error: null };
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return { data: JSON.parse(jsonMatch[1]), error: null };
      }
      
      // Try to find array or object pattern
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      const objectMatch = content.match(/\{[\s\S]*\}/);
      
      if (arrayMatch) {
        return { data: JSON.parse(arrayMatch[0]), error: null };
      }
      if (objectMatch) {
        return { data: JSON.parse(objectMatch[0]), error: null };
      }
      
      return { data: null, error: parseError.message };
    }
  } catch (error) {
    return { data: null, error: error.message };
  }
}

/**
 * Generate unique ID from content
 */
function generateId(entry) {
  const content = JSON.stringify(entry.content || entry);
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `mem_${Math.abs(hash).toString(36)}`;
}

/**
 * Deduplicate entries by ID and content hash
 */
function deduplicateEntries(entries) {
  const seen = new Map();
  const deduplicated = [];
  let duplicateCount = 0;

  entries.forEach(entry => {
    const id = entry.id || generateId(entry);
    const contentHash = JSON.stringify(entry.content || entry);
    
    if (seen.has(id) || seen.has(contentHash)) {
      duplicateCount++;
      return;
    }
    
    seen.set(id, true);
    seen.set(contentHash, true);
    
    deduplicated.push({
      ...entry,
      id: id,
    });
  });

  if (duplicateCount > 0) {
    console.log(`   Removed ${duplicateCount} duplicate entries`);
  }

  return deduplicated;
}

/**
 * Load existing master index
 */
function loadMasterIndex() {
  const masterPath = path.join(process.cwd(), CONFIG.masterIndexPath);
  
  if (!fs.existsSync(masterPath)) {
    return {
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
  }

  const { data, error } = readJsonFile(masterPath);
  if (error) {
    console.error(`Error loading master index: ${error}`);
    process.exit(1);
  }

  return data;
}

/**
 * Create backup of master index
 */
function createBackup(masterIndex) {
  const backupDir = path.join(process.cwd(), CONFIG.backupDir);
  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `master-index-${timestamp}.json`);
  
  fs.writeFileSync(backupPath, JSON.stringify(masterIndex, null, 2));
  console.log(`📦 Backup created: ${backupPath}`);

  // Keep only last 10 backups
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('master-index-'))
    .sort()
    .reverse();
  
  if (backups.length > 10) {
    backups.slice(10).forEach(backup => {
      fs.unlinkSync(path.join(backupDir, backup));
    });
    console.log(`   Cleaned up ${backups.length - 10} old backups`);
  }
}

/**
 * Process output files
 */
function processOutputFiles() {
  const outputsDir = path.join(process.cwd(), CONFIG.outputsDir);
  
  if (!fs.existsSync(outputsDir)) {
    console.log('No outputs directory found. Creating...');
    fs.mkdirSync(outputsDir, { recursive: true });
    return { entries: [], errors: [], sources: [] };
  }

  const files = fs.readdirSync(outputsDir)
    .filter(f => f.endsWith('.json') || f.endsWith('.md') || f.endsWith('.txt'));

  if (files.length === 0) {
    console.log('No output files to process.');
    return { entries: [], errors: [], sources: [] };
  }

  console.log(`\n📂 Processing ${files.length} output files...`);

  const allEntries = [];
  const allErrors = [];
  const sources = [];

  files.forEach(file => {
    const filePath = path.join(outputsDir, file);
    const { data, error } = readJsonFile(filePath);

    if (error) {
      allErrors.push({ file, error });
      console.log(`   ❌ ${file}: Parse error - ${error}`);
      return;
    }

    // Handle array or single object
    const entries = Array.isArray(data) ? data : (data.entries || [data]);
    
    let validCount = 0;
    let invalidCount = 0;

    entries.forEach((entry, index) => {
      const validationErrors = validateMemoryEntry(entry, file);
      
      if (validationErrors.length > 0) {
        invalidCount++;
        if (CONFIG.validateOnly) {
          console.log(`   ⚠️  ${file}[${index}]: ${validationErrors.join(', ')}`);
        }
      } else {
        validCount++;
        allEntries.push({
          ...entry,
          _source: file,
          _importedAt: new Date().toISOString(),
        });
      }
    });

    sources.push({ file, validCount, invalidCount });
    console.log(`   ✅ ${file}: ${validCount} valid, ${invalidCount} invalid`);
  });

  return { entries: allEntries, errors: allErrors, sources };
}

/**
 * Main execution
 */
function main() {
  console.log('🧠 Merge Memory - AI Memory System');
  console.log('===================================\n');

  if (CONFIG.dryRun) {
    console.log('🏃 DRY RUN MODE - No changes will be made\n');
  }

  if (CONFIG.validateOnly) {
    console.log('✅ VALIDATE ONLY MODE - Just checking for errors\n');
  }

  // Load existing master index
  const masterIndex = loadMasterIndex();
  console.log(`📊 Current master index: ${masterIndex.entries.length} entries`);

  // Process output files
  const { entries: newEntries, errors, sources } = processOutputFiles();

  if (errors.length > 0) {
    console.log(`\n⚠️  ${errors.length} files had parsing errors`);
  }

  if (newEntries.length === 0) {
    console.log('\n📭 No new entries to merge.');
    return;
  }

  // Merge and deduplicate
  console.log(`\n🔄 Merging ${newEntries.length} new entries...`);
  const allEntries = [...masterIndex.entries, ...newEntries];
  const deduplicated = deduplicateEntries(allEntries);

  const newCount = deduplicated.length - masterIndex.entries.length;
  console.log(`   Added ${newCount} new unique entries`);

  if (CONFIG.validateOnly) {
    console.log('\n✅ Validation complete!');
    return;
  }

  if (CONFIG.dryRun) {
    console.log('\n🏃 Dry run complete. Would have:');
    console.log(`   - Added ${newCount} new entries`);
    console.log(`   - Updated master index to ${deduplicated.length} total entries`);
    return;
  }

  // Create backup before updating
  if (masterIndex.entries.length > 0) {
    createBackup(masterIndex);
  }

  // Update master index
  const updatedIndex = {
    ...masterIndex,
    updated: new Date().toISOString(),
    entries: deduplicated,
    metadata: {
      ...masterIndex.metadata,
      totalEntries: deduplicated.length,
      lastMerge: new Date().toISOString(),
      sources: [
        ...(masterIndex.metadata.sources || []),
        ...sources.map(s => ({
          ...s,
          mergedAt: new Date().toISOString(),
        })),
      ],
    },
  };

  // Write updated index
  const masterPath = path.join(process.cwd(), CONFIG.masterIndexPath);
  fs.mkdirSync(path.dirname(masterPath), { recursive: true });
  fs.writeFileSync(masterPath, JSON.stringify(updatedIndex, null, 2));

  console.log(`\n✅ Master index updated: ${masterPath}`);
  console.log(`   Total entries: ${updatedIndex.entries.length}`);
  console.log(`   New entries: ${newCount}`);

  // Optionally archive processed files
  const archiveDir = path.join(process.cwd(), 'ai-memory/outputs/archived');
  fs.mkdirSync(archiveDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  sources.forEach(({ file }) => {
    const srcPath = path.join(process.cwd(), CONFIG.outputsDir, file);
    const destPath = path.join(archiveDir, `${timestamp}-${file}`);
    fs.renameSync(srcPath, destPath);
  });
  
  console.log(`\n📁 Archived ${sources.length} processed files`);
}

main();
