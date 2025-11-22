#!/usr/bin/env node

/**
 * Production Readiness Check Script
 * Comprehensive verification before deployment
 */

const { exec } = require('child_process');
const fs = require('fs');

class ProductionCheck {
  constructor() {
    this.checks = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runAllChecks() {
    console.log('🔍 PRODUCTION READINESS CHECK\n');
    console.log('='.repeat(50));
    
    await this.checkEnvironmentVariables();
    await this.checkDependencies();
    await this.checkSecurity();
    await this.checkPerformance();
    await this.checkAPI();
    await this.checkDatabase();
    
    this.printResults();
    return this.failed === 0;
  }

  async checkEnvironmentVariables() {
    console.log('\n📋 Checking Environment Variables...');
    
    const required = [
      'NODE_ENV',
      'MONGODB_URI', 
      'JWT_SECRET',
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASS'
    ];
    
    const optional = [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'WHATSAPP_ENABLED',
      'PUSH_ENABLED'
    ];
    
    for (const env of required) {
      this.check(`Required: ${env}`, process.env[env] !== undefined);
    }
    
    for (const env of optional) {
      const exists = process.env[env] !== undefined;
      console.log(`  ${exists ? '✅' : '⚠️'} Optional: ${env} ${exists ? 'SET' : 'NOT SET'}`);
    }
  }

  async checkDependencies() {
    console.log('\n📋 Checking Dependencies...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      this.check('package.json exists', true);
      this.check('Has dependencies', Object.keys(packageJson.dependencies || {}).length > 0);
      
      // Check for security vulnerabilities
      await this.execCheck('npm audit --audit-level=high', 'No high/critical vulnerabilities');
      
    } catch (_error) {
      this.check('package.json readable', false);
    }
  }

  async checkSecurity() {
    console.log('\n📋 Checking Security...');
    
    // Check JWT secret strength
    const jwtSecret = process.env.JWT_SECRET;
    this.check('JWT_SECRET exists', !!jwtSecret);
    this.check('JWT_SECRET strong (32+ chars)', jwtSecret && jwtSecret.length >= 32);
    
    // Check NODE_ENV
    this.check('NODE_ENV set to production', process.env.NODE_ENV === 'production');
    
    // Check for common security files
    this.check('.env not in git', !fs.existsSync('.env') || this.isGitIgnored('.env'));
    this.check('Helmet middleware', this.codeContains('server.js', 'helmet'));
    this.check('Rate limiting', this.codeContains('server.js', 'rateLimit'));
  }

  async checkPerformance() {
    console.log('\n📋 Checking Performance...');
    
    this.check('Compression enabled', this.codeContains('server.js', 'compression'));
    this.check('Database connection pooling', this.codeContains('server.js', 'maxPoolSize'));
    this.check('Static file caching', this.codeContains('server.js', 'static'));
  }

  async checkAPI() {
    console.log('\n📋 Checking API...');
    
    try {
      // Check if server is running
      const response = await fetch('http://localhost:5000/health');
      this.check('Server responding', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        this.check('Health endpoint working', data.status === 'ok');
        this.check('Database connected', data.database.status === 'connected');
      }
      
      // Check API documentation
      this.check('API documentation available', this.codeContains('server.js', 'api-docs'));
      
    } catch (error) {
      this.check('Server reachable', false);
    }
  }

  async checkDatabase() {
    console.log('\n📋 Checking Database...');
    
    const mongoUri = process.env.MONGODB_URI;
    this.check('MongoDB URI configured', !!mongoUri);
    this.check('MongoDB URI uses SSL', mongoUri && mongoUri.includes('ssl=true'));
    this.check('MongoDB connection pooling', mongoUri && mongoUri.includes('maxPoolSize'));
  }

  check(name, condition) {
    if (condition) {
      this.passed++;
      console.log(`  ✅ ${name}`);
    } else {
      this.failed++;
      console.log(`  ❌ ${name}`);
    }
    
    this.checks.push({ name, passed: condition });
  }

  async execCheck(command, description) {
    return new Promise((resolve) => {
      exec(command, (error) => {
        this.check(description, error === null);
        resolve();
      });
    });
  }

  codeContains(file, text) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      return content.includes(text);
    } catch {
      return false;
    }
  }

  isGitIgnored(file) {
    try {
      const gitignore = fs.readFileSync('.gitignore', 'utf8');
      return gitignore.includes(file);
    } catch {
      return false;
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('🎯 PRODUCTION READINESS RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    
    const total = this.passed + this.failed;
    const percentage = total > 0 ? Math.round((this.passed / total) * 100) : 0;
    console.log(`📊 Success Rate: ${percentage}%`);
    
    if (this.failed === 0) {
      console.log('\n🎉 PRODUCTION READY!');
      console.log('🚀 All checks passed - safe to deploy!');
    } else {
      console.log('\n⚠️  NOT READY FOR PRODUCTION');
      console.log('❌ Please fix the failed checks before deployment');
      
      console.log('\nFailed checks:');
      this.checks
        .filter(c => !c.passed)
        .forEach(c => console.log(`  - ${c.name}`));
    }
    
    return this.failed === 0;
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new ProductionCheck();
  checker.runAllChecks().then((ready) => {
    process.exit(ready ? 0 : 1);
  });
}

module.exports = ProductionCheck;
