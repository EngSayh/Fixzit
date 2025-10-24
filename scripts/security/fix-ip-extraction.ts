#!/usr/bin/env tsx
/**
 * CRITICAL SECURITY FIX: Replace Unsafe IP Extraction Patterns
 * 
 * This script replaces all unsafe IP extraction patterns across the codebase
 * with the centralized secure function.
    // Only replace the assignment; import insertion is handled separately
    replace: 'const clientIp = getClientIP(req);'
 * VULNERABILITY: x-forwarded-for?.split(',')[0] uses FIRST IP (client-controlled)
 * FIX: Import and use getClientIP() which uses LAST IP (trusted proxy)
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

// Patterns to find and replace
const UNSAFE_PATTERNS = [
  {
    // Pattern 1: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    // Only replace the assignment, not the import (import insertion handled separately)
    find: /const\s+clientIp\s*=\s*req\.headers\.get\(['"](x-forwarded-for|X-Forwarded-For)['"]\)\?\.split\(['"],['"]\)\[0\]\?\.trim\(\)\s*\|\|\s*['"]unknown['"];/g,
    replace: "const clientIp = getClientIP(req);"
  },
  {
    // Pattern 2: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown"
    find: /req\.headers\.get\(["'](x-forwarded-for|X-Forwarded-For)["']\)\?\.split\(["'],["']\)\[0\]\s*\|\|\s*req\.headers\.get\(["'](x-real-ip|X-Real-IP)["']\)\s*\|\|\s*["']unknown["']/g,
    replace: 'getClientIP(req)'
  },
  {
    // Pattern 3: Simple inline pattern
    find: /req\.headers\.get\(['"](x-forwarded-for|X-Forwarded-For)['"]\)\?\.split\(['"],['"]\)\[0\]\?\.trim\(\)\s*\|\|\s*['"](unknown|local|anonymous)['"]/g,
    replace: 'getClientIP(req)'
  }
];

async function fixFile(filePath: string): Promise<boolean> {
  try {
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Check if file has unsafe patterns
    const hasUnsafe = /x-forwarded-for.*split.*\[0\]/i.test(content);
    if (!hasUnsafe) return false;
    
    // Check if already imports getClientIP
    const hasImport = /import.*getClientIP.*from.*server\/security\/headers/.test(content);
    
    // Add import if not present
    if (!hasImport && hasUnsafe) {
      // Find any existing import statements
      const importMatch = content.match(/import[^;]+;/g);
      if (importMatch && importMatch.length > 0) {
        // Insert after last import
        const lastImport = importMatch[importMatch.length - 1];
        const importIndex = content.lastIndexOf(lastImport);
        content = content.slice(0, importIndex + lastImport.length) + 
                  "\nimport { getClientIP } from '@/server/security/headers';" +
                  content.slice(importIndex + lastImport.length);
        modified = true;
      } else {
        // No import statements found - insert near top after shebang or 'use client'/'use server' directives
        let insertPos = 0;
        
        // Skip shebang if present
        const shebangMatch = content.match(/^#!.*\n/);
        if (shebangMatch) {
          insertPos = shebangMatch[0].length;
        }

        // Skip 'use client' or 'use server' directives
        const remainingContent = content.slice(insertPos);
        const directiveMatch = remainingContent.match(/^(['"]use (client|server)['"])\s*;?\s*\n/);
        if (directiveMatch) {
          insertPos += directiveMatch[0].length;
        }

        // Insert import at calculated position
        content = content.slice(0, insertPos) + 
                  "import { getClientIP } from '@/server/security/headers';\n\n" + 
                  content.slice(insertPos);
        modified = true;
      }
    }
    
    // Replace all unsafe patterns
    UNSAFE_PATTERNS.forEach(pattern => {
      if (pattern.find.test(content)) {
        content = content.replace(pattern.find, pattern.replace);
        modified = true;
      }
    });
    
    // Manual replacements for specific patterns
    if (/const\s+clientIp\s*=\s*req\.headers\.get\(['"](x-forwarded-for|X-Forwarded-For)['"]\)\?\.split\(['"],['"]\)\[0\]/.test(content)) {
      content = content.replace(
        /const\s+clientIp\s*=\s*req\.headers\.get\(['"](x-forwarded-for|X-Forwarded-For)['"]\)\?\.split\(['"],['"]\)\[0\]\?\.trim\(\)\s*\|\|\s*['"]unknown['"];?/g,
        'const clientIp = getClientIP(req);'
      );
      modified = true;
    }
    
    if (/const\s+ip\s*=\s*req\.headers\.get\(['"](x-forwarded-for|X-Forwarded-For)['"]\)\?\.split\(['"],['"]\)\[0\]/.test(content)) {
      content = content.replace(
        /const\s+ip\s*=\s*req\.headers\.get\(['"](x-forwarded-for|X-Forwarded-For)['"]\)\?\.split\(['"],['"]\)\[0\]\?\.trim\(\)\s*\|\|\s*['"](?:unknown|local|anonymous)['"];?/g,
        'const ip = getClientIP(req);'
      );
      modified = true;
    }
    
    // Replace inline usages in function calls
    if (/req\.headers\.get\(["'](x-forwarded-for|X-Forwarded-For)["']\)\?\.split\(["'],["']\)\[0\]/.test(content)) {
      content = content.replace(
        /req\.headers\.get\(["'](x-forwarded-for|X-Forwarded-For)["']\)\?\.split\(["'],["']\)\[0\]\s*\|\|\s*req\.headers\.get\(["'](x-real-ip|X-Real-IP)["']\)\s*\|\|\s*["']unknown["']/g,
        'getClientIP(req)'
      );
      modified = true;
    }
    
    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error);
    return false;
  }
}

async function main() {
  console.log('🔍 Scanning for unsafe IP extraction patterns...\n');
  
  const files = await glob('app/api/**/*.ts', { ignore: ['node_modules/**', '.next/**'] });
  console.log(`📁 Found ${files.length} API route files\n`);
  
  let fixedCount = 0;
  const fixedFiles: string[] = [];
  
  for (const file of files) {
    const fixed = await fixFile(file);
    if (fixed) {
      fixedCount++;
      fixedFiles.push(file);
    }
  }
  
  console.log(`\n✅ Fixed ${fixedCount} files with unsafe IP extraction patterns`);
  
  if (fixedFiles.length > 0) {
    console.log('\n📝 Fixed files:');
    fixedFiles.forEach(f => console.log(`   - ${f}`));
  }
  
  console.log('\n🔒 All IP extraction now uses secure centralized function (LAST IP from trusted proxy)');
}

main().catch(console.error);
