#!/usr/bin/env node

/**
 * FIXZIT SOUQ Phase 1 - Comprehensive Code Scanner
 * Run this scanner to detect all issues in your codebase
 * Usage: node scanner.js [--fix] [--report] [--severity=critical]
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

// Scanner configuration
const config = {
  projectRoot: process.cwd(),
  excludeDirs: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.replit'],
  fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.env', '.sql'],
  apiRoutes: ['pages/api', 'src/api', 'app/api', 'routes'],
  maxFileSize: 1024 * 1024 * 10, // 10MB
  issues: [],
  stats: {
    filesScanned: 0,
    totalLines: 0,
    totalIssues: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  }
};

// Issue severity levels
const Severity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

// Main scanner class
class FixzitScanner {
  constructor() {
    this.issues = [];
    this.fileCache = new Map();
  }

  // Main scan function
  async scan() {

    try {
      // 1. File System Scan
      await this.scanFileSystem();
      
      // 2. Security Vulnerabilities
      await this.scanSecurity();
      
      // 3. Route Configuration
      await this.scanRoutes();
      
      // 4. Database Issues
      await this.scanDatabase();
      
      // 5. API & Integration
      await this.scanAPIs();
      
      // 6. Performance Issues
      await this.scanPerformance();
      
      // 7. TypeScript/JavaScript Errors
      await this.scanTypeScriptErrors();
      
      // 8. Dependencies
      await this.scanDependencies();
      
      // 9. Multi-tenant Issues
      await this.scanMultiTenant();
      
      // 10. Localization & RTL
      await this.scanLocalization();
      
      // 11. ZATCA Compliance
      await this.scanZATCACompliance();
      
      // 12. Code Quality
      await this.scanCodeQuality();
      
      // 13. Testing Coverage
      await this.scanTestCoverage();
      
      // Generate Report
      await this.generateReport();
      
    } catch (error) {
      console.error(`${colors.red}Scanner Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }

  // Scan single file
  async scanFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > config.maxFileSize) {
        this.addIssue({
          type: 'Performance',
          severity: Severity.MEDIUM,
          file: filePath,
          issue: `Large file size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`
        });
        return;
      }
      
      const content = await fs.readFile(filePath, 'utf-8');
      this.fileCache.set(filePath, content);
      
      const lines = content.split('\n').length;
      config.stats.totalLines += lines;
      
      if (lines > 500) {
        this.addIssue({
          type: 'Code Quality',
          severity: Severity.LOW,
          file: filePath,
          issue: `Large file: ${lines} lines`
        });
      }
    } catch (error) {
      // File might be binary or inaccessible
    }
  }

  // Add issue to list
  addIssue(issue) {
    this.issues.push(issue);
    config.stats.totalIssues++;
    config.stats[issue.severity]++;
  }

  // Find line numbers for pattern matches
  findLineNumbers(content, pattern) {
    const lines = content.split('\n');
    const matchedLines = [];
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matchedLines.push(index + 1);
      }
    });
    return matchedLines;
  }

  // 1. FILE SYSTEM SCAN
  async scanFileSystem() {

    const scanDir = async (dir) => {
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          
          if (item.isDirectory()) {
            if (!config.excludeDirs.includes(item.name)) {
              await scanDir(fullPath);
            }
          } else if (item.isFile()) {
            const ext = path.extname(item.name);
            if (config.fileExtensions.includes(ext)) {
              await this.scanFile(fullPath);
              config.stats.filesScanned++;
            }
          }
        }
      } catch (err) {
        // Directory might not be accessible
      }
    };
    
    await scanDir(config.projectRoot);

  }

  // 2. SECURITY VULNERABILITIES SCAN
  async scanSecurity() {

    const securityPatterns = [
      // Authentication Issues
      { pattern: /jwt\.sign([^,]+,\s*['"][^'"]+['"]\s*,\s*\{[^}]*\})/gi, issue: 'JWT without expiration', severity: Severity.CRITICAL },
      { pattern: /localStorage\.setItem\(['"][^'"]*token/gi, issue: 'Token stored in localStorage', severity: Severity.HIGH },
      { pattern: /eval\s*\(/g, issue: 'eval() usage detected', severity: Severity.CRITICAL },
      { pattern: /innerHTML\s*=/g, issue: 'innerHTML usage (XSS risk)', severity: Severity.HIGH },
      
      // SQL Injection
      { pattern: /query\s*\(\s*['"`].*\$\{.*\}.*['"`]/g, issue: 'SQL injection vulnerability', severity: Severity.CRITICAL },
      { pattern: /query\s*\(\s*['"`].*\+.*['"`]/g, issue: 'SQL concatenation detected', severity: Severity.CRITICAL },
      
      // API Keys & Secrets
      { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi, issue: 'API key in code', severity: Severity.CRITICAL },
      { pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi, issue: 'Hardcoded password', severity: Severity.CRITICAL },
      
      // CORS Issues
      { pattern: /Access-Control-Allow-Origin.*\*/g, issue: 'CORS wildcard origin', severity: Severity.HIGH },
      { pattern: /cors(\s*)/g, issue: 'CORS without configuration', severity: Severity.HIGH },
      
      // Console statements
      { pattern: /console\.(log|error|warn|info)/g, issue: 'Console statement in code', severity: Severity.LOW },
      { pattern: /debugger/g, issue: 'Debugger statement', severity: Severity.HIGH },
    ];
    
    for (const [filePath, content] of this.fileCache) {
      for (const { pattern, issue, severity } of securityPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          this.addIssue({
            type: 'Security',
            severity,
            file: filePath,
            issue,
            count: matches.length,
            lines: this.findLineNumbers(content, pattern)
          });
        }
      }
    }

  }

  // 3. ROUTE CONFIGURATION SCAN
  async scanRoutes() {

    const routePatterns = [
      // Missing authentication
      { pattern: /router\.(get|post|put|delete|patch)\s*([^,]*,\s*(?!.*auth)/g, issue: 'Route without authentication', severity: Severity.CRITICAL },
      
      // Missing rate limiting
      { pattern: /\/api\/(?!.*rateLimit).*$/gm, issue: 'API route without rate limiting', severity: Severity.HIGH },
      
      // Debug routes
      { pattern: /\/(debug|test|temp|admin\/debug)/g, issue: 'Debug route exposed', severity: Severity.CRITICAL },
      
      // Error handling
      { pattern: /catch\s*([^)]*)\s*\{\s*\}/g, issue: 'Empty catch block', severity: Severity.MEDIUM },
      { pattern: /throw\s+new\s+Error([^)]*)(?!\s*;?\s*})/g, issue: 'Unhandled error throw', severity: Severity.MEDIUM },
    ];
    
    // Scan route files
    for (const [filePath, content] of this.fileCache) {
      if (filePath.includes('routes/') || filePath.includes('/api/')) {
        for (const { pattern, issue, severity } of routePatterns) {
          const matches = content.match(pattern);
          if (matches) {
            this.addIssue({
              type: 'Route',
              severity,
              file: filePath,
              issue,
              count: matches.length
            });
          }
        }
      }
    }

  }

  // 4. DATABASE ISSUES SCAN
  async scanDatabase() {

    const dbPatterns = [
      // N+1 Queries
      { pattern: /\.map\s*([^)]*await\s+[^)]*\.(find|query|select)/g, issue: 'N+1 query pattern detected', severity: Severity.HIGH },
      
      // Missing indexes
      { pattern: /where\s+[^.]+\.(?!id|_id|uuid)/gi, issue: 'Query on non-indexed field', severity: Severity.MEDIUM },
      
      // Transaction issues
      { pattern: /BEGIN|START\s+TRANSACTION(?![\s\S]*COMMIT|ROLLBACK)/gi, issue: 'Transaction without commit/rollback', severity: Severity.HIGH },
      
      // Connection leaks
      { pattern: /createConnection|connect((?![\s\S]*\.close()|\.end())/g, issue: 'Database connection not closed', severity: Severity.HIGH },
      
      // Injection vulnerabilities
      { pattern: /\$\{[^}]*\}.*(?:WHERE|AND|OR)/gi, issue: 'Template literal in SQL query', severity: Severity.CRITICAL },
    ];
    
    for (const [filePath, content] of this.fileCache) {
      for (const { pattern, issue, severity } of dbPatterns) {
        if (pattern.test(content)) {
          this.addIssue({
            type: 'Database',
            severity,
            file: filePath,
            issue
          });
        }
      }
    }

  }

  // 5. API & INTEGRATION SCAN
  async scanAPIs() {

    const apiPatterns = [
      // Missing error handling
      { pattern: /fetch([^)]+)(?!\.then(|\.catch(|await)/g, issue: 'Fetch without error handling', severity: Severity.HIGH },
      { pattern: /axios\.[a-z]+([^)]+)(?!\.then(|\.catch(|await)/g, issue: 'Axios without error handling', severity: Severity.HIGH },
      
      // Missing timeout
      { pattern: /fetch([^)]+)(?![^}]*timeout)/g, issue: 'Fetch without timeout', severity: Severity.MEDIUM },
      
      // API versioning
      { pattern: /\/api\/(?!v\d+)/g, issue: 'API without versioning', severity: Severity.LOW },
      
      // ZATCA specific
      { pattern: /zatca|invoice.*qr|e-?invoice/gi, issue: 'ZATCA integration check needed', severity: Severity.HIGH },
      
      // Payment gateway
      { pattern: /stripe|payment|card.*number/gi, issue: 'Payment processing check needed', severity: Severity.CRITICAL },
    ];
    
    for (const [filePath, content] of this.fileCache) {
      for (const { pattern, issue, severity } of apiPatterns) {
        if (pattern.test(content)) {
          this.addIssue({
            type: 'API/Integration',
            severity,
            file: filePath,
            issue
          });
        }
      }
    }

  }

  // 6. PERFORMANCE SCAN
  async scanPerformance() {

    const performancePatterns = [
      // React performance
      { pattern: /useEffect([^,]+)/g, issue: 'useEffect without dependencies', severity: Severity.MEDIUM },
      
      // Bundle size
      { pattern: /import\s+\*\s+as/g, issue: 'Full library import', severity: Severity.MEDIUM },
      { pattern: /require(['"][^'"]+['"])/g, issue: 'Dynamic require (affects bundling)', severity: Severity.MEDIUM },
      
      // Memory leaks
      { pattern: /addEventListener(?![\s\S]*removeEventListener)/g, issue: 'Event listener not removed', severity: Severity.HIGH },
      { pattern: /setInterval(?![\s\S]*clearInterval)/g, issue: 'Interval not cleared', severity: Severity.HIGH },
      
      // Inefficient operations
      { pattern: /JSON\.parse(JSON\.stringify/g, issue: 'Inefficient deep clone', severity: Severity.MEDIUM },
    ];
    
    for (const [filePath, content] of this.fileCache) {
      for (const { pattern, issue, severity } of performancePatterns) {
        if (pattern.test(content)) {
          this.addIssue({
            type: 'Performance',
            severity,
            file: filePath,
            issue
          });
        }
      }
    }

  }

  // 7. TYPESCRIPT ERRORS SCAN
  async scanTypeScriptErrors() {

    const tsPatterns = [
      // Type errors
      { pattern: /any(?:\[\])?(?:\s*[,;]|\s*))/g, issue: 'Using "any" type', severity: Severity.LOW },
      { pattern: /@ts-ignore|@ts-nocheck/g, issue: 'TypeScript checks disabled', severity: Severity.MEDIUM },
      { pattern: /\!\./g, issue: 'Non-null assertion operator', severity: Severity.LOW },
      
      // Common errors
      { pattern: /TODO|FIXME|HACK|XXX/g, issue: 'Unresolved TODO/FIXME', severity: Severity.LOW },
      
      // Async issues
      { pattern: /async\s+([^)]*)\s*=>\s*(?!.*await)/g, issue: 'Async function without await', severity: Severity.LOW },
      { pattern: /new\s+Promise([^)]+)(?!.*(?:resolve|reject))/g, issue: 'Promise without resolve/reject', severity: Severity.HIGH },
    ];
    
    for (const [filePath, content] of this.fileCache) {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        for (const { pattern, issue, severity } of tsPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            this.addIssue({
              type: 'TypeScript',
              severity,
              file: filePath,
              issue,
              count: matches.length
            });
          }
        }
      }
    }

  }

  // 8. DEPENDENCIES SCAN
  async scanDependencies() {

    try {
      // Check package.json
      const packagePath = path.join(config.projectRoot, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const pkg = JSON.parse(packageContent);
      
      const depCount = Object.keys(pkg.dependencies || {}).length;
      const devDepCount = Object.keys(pkg.devDependencies || {}).length;
      
      if (depCount > 50) {
        this.addIssue({
          type: 'Dependencies',
          severity: Severity.MEDIUM,
          file: 'package.json',
          issue: `Too many dependencies (${depCount})`,
        });
      }
      
      if (devDepCount > 30) {
        this.addIssue({
          type: 'Dependencies',
          severity: Severity.LOW,
          file: 'package.json',
          issue: `Many dev dependencies (${devDepCount})`,
        });
      }
    } catch (err) {
      // package.json might not exist
    }

  }

  // 9. MULTI-TENANT SCAN
  async scanMultiTenant() {

    const tenantPatterns = [
      // Missing tenant isolation
      { pattern: /(?:find|query|select)(?!.*tenant|.*where.*tenant)/gi, issue: 'Query without tenant filter', severity: Severity.CRITICAL },
      { pattern: /DELETE\s+FROM(?!.*WHERE.*tenant)/gi, issue: 'DELETE without tenant filter', severity: Severity.CRITICAL },
      { pattern: /UPDATE\s+\w+\s+SET(?!.*WHERE.*tenant)/gi, issue: 'UPDATE without tenant filter', severity: Severity.CRITICAL },
      
      // Cross-tenant references
      { pattern: /JOIN(?!.*ON.*tenant)/gi, issue: 'JOIN without tenant constraint', severity: Severity.HIGH },
      
      // Global operations
      { pattern: /cache\.(get|set)([^,)]+)(?!.*tenant)/g, issue: 'Cache without tenant namespace', severity: Severity.HIGH },
    ];
    
    for (const [filePath, content] of this.fileCache) {
      for (const { pattern, issue, severity } of tenantPatterns) {
        if (pattern.test(content)) {
          this.addIssue({
            type: 'Multi-tenant',
            severity,
            file: filePath,
            issue
          });
        }
      }
    }

  }

  // 10. LOCALIZATION SCAN
  async scanLocalization() {

    const i18nPatterns = [
      // Hardcoded text
      { pattern: />([A-Z][a-z]+(?:\s+[a-z]+)+)</g, issue: 'Hardcoded English text in JSX', severity: Severity.LOW },
      { pattern: /placeholder=["'][A-Z][a-z]+/g, issue: 'Hardcoded placeholder text', severity: Severity.LOW },
      
      // RTL issues
      { pattern: /left:\s*\d+|margin-left:|padding-left:/g, issue: 'Fixed left positioning (RTL issue)', severity: Severity.MEDIUM },
      { pattern: /right:\s*\d+|margin-right:|padding-right:/g, issue: 'Fixed right positioning (RTL issue)', severity: Severity.MEDIUM },
      { pattern: /float:\s*(?:left|right)/g, issue: 'Float direction (RTL issue)', severity: Severity.MEDIUM },
      
      // Date/Number formatting
      { pattern: /new\s+Date()\.to(?:Date|Time|Locale)String()/g, issue: 'Date formatting without locale', severity: Severity.MEDIUM },
    ];
    
    for (const [filePath, content] of this.fileCache) {
      for (const { pattern, issue, severity } of i18nPatterns) {
        if (pattern.test(content)) {
          this.addIssue({
            type: 'Localization',
            severity,
            file: filePath,
            issue
          });
        }
      }
    }

  }

  // 11. ZATCA COMPLIANCE SCAN
  async scanZATCACompliance() {

    const zatcaPatterns = [
      // Missing ZATCA features
      { pattern: /invoice(?!.*zatca|.*qr|.*xml)/gi, issue: 'Invoice without ZATCA compliance', severity: Severity.CRITICAL },
      { pattern: /qr.*code(?!.*zatca)/gi, issue: 'QR code without ZATCA format', severity: Severity.HIGH },
      { pattern: /tax.*number(?!.*format|.*validate)/gi, issue: 'Tax number without validation', severity: Severity.HIGH },
      
      // Digital signature
      { pattern: /sign(?:ature)?(?!.*digital|.*certificate)/gi, issue: 'Signing without digital certificate', severity: Severity.CRITICAL },
    ];
    
    for (const [filePath, content] of this.fileCache) {
      if (filePath.includes('invoice') || filePath.includes('finance') || filePath.includes('zatca')) {
        for (const { pattern, issue, severity } of zatcaPatterns) {
          if (pattern.test(content)) {
            this.addIssue({
              type: 'ZATCA',
              severity,
              file: filePath,
              issue
            });
          }
        }
      }
    }

  }

  // 12. CODE QUALITY SCAN
  async scanCodeQuality() {

    const qualityPatterns = [
      // Long functions
      { pattern: /function[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, issue: 'Long function detected', severity: Severity.LOW },
      
      // Deep nesting
      { pattern: /\s{8,}\w+/g, issue: 'Deep nesting detected', severity: Severity.MEDIUM },
      
      // Duplicate code
      { pattern: /(\w+\s*=\s*\w+\s*;?\s*){3,}/g, issue: 'Potential duplicate code', severity: Severity.LOW },
      
      // Magic numbers
      { pattern: /\b(?!0|1|2|10|100|1000)\d{2,}\b/g, issue: 'Magic number detected', severity: Severity.LOW },
    ];
    
    for (const [filePath, content] of this.fileCache) {
      for (const { pattern, issue, severity } of qualityPatterns) {
        const matches = content.match(pattern);
        if (matches && matches.length > 5) { // Only report if significant
          this.addIssue({
            type: 'Code Quality',
            severity,
            file: filePath,
            issue,
            count: matches.length
          });
        }
      }
    }

  }

  // 13. TESTING COVERAGE SCAN
  async scanTestCoverage() {

    let testFiles = 0;
    let sourceFiles = 0;
    
    for (const [filePath] of this.fileCache) {
      if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')) {
        testFiles++;
      } else if (filePath.endsWith('.js') || filePath.endsWith('.ts') || filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) {
        sourceFiles++;
      }
    }
    
    const testCoverage = sourceFiles > 0 ? (testFiles / sourceFiles) * 100 : 0;
    
    if (testCoverage < 50) {
      this.addIssue({
        type: 'Testing',
        severity: Severity.HIGH,
        file: 'Test Coverage',
        issue: `Low test coverage: ${testCoverage.toFixed(1)}%`
      });
    }
    
    if (testFiles === 0) {
      this.addIssue({
        type: 'Testing',
        severity: Severity.CRITICAL,
        file: 'Test Coverage',
        issue: 'No test files found'
      });
    }}% coverage)\n`);
  }

  // Generate comprehensive report
  async generateReport() {

    // Statistics}`);

    // Issues by severity

    // Critical issues details
    if (config.stats.critical > 0) {:${colors.reset}`);
      const criticalIssues = this.issues.filter(i => i.severity === Severity.CRITICAL).slice(0, 10);
      
      criticalIssues.forEach((issue, index) => {

        if (issue.lines && issue.lines.length > 0) {.join(', ')}${issue.lines.length > 5 ? '...' : ''}`);
        }
        if (issue.count && issue.count > 1) {

        }

      });
      
      if (this.issues.filter(i => i.severity === Severity.CRITICAL).length > 10) {.length - 10} more critical issues`);

      }
    }
    
    // High priority issues
    if (config.stats.high > 0) {:${colors.reset}`);
      const highIssues = this.issues.filter(i => i.severity === Severity.HIGH).slice(0, 5);
      
      highIssues.forEach((issue, index) => {}`);
      });

    }
    
    // System health score
    const maxPossibleScore = 100;
    const criticalPenalty = config.stats.critical * 15;
    const highPenalty = config.stats.high * 5;
    const mediumPenalty = config.stats.medium * 2;
    const lowPenalty = config.stats.low * 0.5;
    
    const totalPenalty = criticalPenalty + highPenalty + mediumPenalty + lowPenalty;
    const healthScore = Math.max(0, maxPossibleScore - totalPenalty);
    
    const healthColor = healthScore >= 80 ? colors.green : 
                        healthScore >= 60 ? colors.yellow : colors.red;}/100${colors.reset}`);
    
    if (healthScore < 50) {

    } else if (healthScore < 70) {

    } else if (healthScore >= 90) {

    }

    // Recommendations

    if (config.stats.critical > 0) {

    }
    if (config.stats.high > 5) {

    }
    if (config.stats.medium > 10) {

    }`);

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      stats: config.stats,
      healthScore: healthScore.toFixed(0),
      issues: this.issues,
      recommendations: [
        'Fix all critical security vulnerabilities',
        'Implement proper error handling in API routes',
        'Add comprehensive testing suite',
        'Optimize database queries and add indexes',
        'Enhance ZATCA compliance implementation'
      ]
    };
    
    const reportPath = path.join(config.projectRoot, 'fixzit-scan-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Exit code based on critical issues
    if (config.stats.critical > 0) {

      process.exit(1);
    } else {

      process.exit(0);
    }
  }
}

// Run scanner
const scanner = new FixzitScanner();
scanner.scan();