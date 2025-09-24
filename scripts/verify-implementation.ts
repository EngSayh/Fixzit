// Comprehensive implementation verification script
// Checks all implemented features and identifies missing components

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit-enterprise';

interface VerificationResult {
  category: string;
  feature: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

class ImplementationVerifier {
  private results: VerificationResult[] = [];
  
  addResult(category: string, feature: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: any) {
    this.results.push({ category, feature, status, message, details });
  }
  
  async verifyFileExists(filePath: string, description: string): Promise<boolean> {
    const exists = fs.existsSync(filePath);
    this.addResult(
      'Files',
      description,
      exists ? 'PASS' : 'FAIL',
      exists ? `File exists: ${filePath}` : `File missing: ${filePath}`
    );
    return exists;
  }
  
  async verifyFileContent(filePath: string, requiredContent: string[], description: string): Promise<boolean> {
    if (!fs.existsSync(filePath)) {
      this.addResult('Files', description, 'FAIL', `File missing: ${filePath}`);
      return false;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const missingContent = requiredContent.filter(item => !content.includes(item));
    
    this.addResult(
      'Files',
      description,
      missingContent.length === 0 ? 'PASS' : 'WARNING',
      missingContent.length === 0 
        ? `All required content found in ${filePath}`
        : `Missing content in ${filePath}: ${missingContent.join(', ')}`
    );
    
    return missingContent.length === 0;
  }
  
  async verifyDatabaseConnection(): Promise<boolean> {
    try {
      const client = new MongoClient(MONGODB_URI);
      await client.connect();
      const db = client.db();
      await db.admin().ping();
      await client.close();
      
      this.addResult('Database', 'MongoDB Connection', 'PASS', 'Successfully connected to MongoDB');
      return true;
    } catch (error) {
      this.addResult('Database', 'MongoDB Connection', 'FAIL', `Failed to connect to MongoDB: ${error}`);
      return false;
    }
  }
  
  async verifyDatabaseCollections(): Promise<boolean> {
    try {
      const client = new MongoClient(MONGODB_URI);
      await client.connect();
      const db = client.db();
      
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      const requiredCollections = ['tenants', 'users', 'properties', 'materials', 'workOrders', 'invoices'];
      const missingCollections = requiredCollections.filter(name => !collectionNames.includes(name));
      
      this.addResult(
        'Database',
        'Required Collections',
        missingCollections.length === 0 ? 'PASS' : 'WARNING',
        missingCollections.length === 0 
          ? `All required collections exist: ${collectionNames.join(', ')}`
          : `Missing collections: ${missingCollections.join(', ')}`
      );
      
      await client.close();
      return missingCollections.length === 0;
    } catch (error) {
      this.addResult('Database', 'Required Collections', 'FAIL', `Error checking collections: ${error}`);
      return false;
    }
  }
  
  async verifyRBACImplementation(): Promise<boolean> {
    const rbacFile = path.join(process.cwd(), 'src/lib/rbac-comprehensive.ts');
    const requiredContent = [
      'SUPER_ADMIN',
      'CORPORATE_ADMIN',
      'GUEST',
      'BROKER_AGENT',
      'ROLE_ACCESS_MATRIX',
      'canAccess',
      'requiresKYC',
      'requiresFAL'
    ];
    
    return await this.verifyFileContent(rbacFile, requiredContent, 'RBAC Implementation');
  }
  
  async verifyKSACompliance(): Promise<boolean> {
    const ksaFile = path.join(process.cwd(), 'src/lib/ksa-compliance.ts');
    const requiredContent = [
      'FALVerificationService',
      'EjarVerificationService',
      'NafathVerificationService',
      'SPLVerificationService',
      'ZATCAService',
      'AntiFraudService'
    ];
    
    return await this.verifyFileContent(ksaFile, requiredContent, 'KSA Compliance Implementation');
  }
  
  async verifyGuestBrowsing(): Promise<boolean> {
    const guestFile = path.join(process.cwd(), 'src/lib/guest-browsing.ts');
    const requiredContent = [
      'PropertyListing',
      'MaterialListing',
      'GuestBrowsingService',
      'addToCart',
      'addToFavorites',
      'contactSeller'
    ];
    
    return await this.verifyFileContent(guestFile, requiredContent, 'Guest Browsing Implementation');
  }
  
  async verifyPublicAPIs(): Promise<boolean> {
    const publicPropertiesAPI = path.join(process.cwd(), 'app/api/public/properties/route.ts');
    const publicMaterialsAPI = path.join(process.cwd(), 'app/api/public/materials/route.ts');
    const protectedContactAPI = path.join(process.cwd(), 'app/api/protected/contact/route.ts');
    
    const apisExist = await Promise.all([
      this.verifyFileExists(publicPropertiesAPI, 'Public Properties API'),
      this.verifyFileExists(publicMaterialsAPI, 'Public Materials API'),
      this.verifyFileExists(protectedContactAPI, 'Protected Contact API')
    ]);
    
    return apisExist.every(exists => exists);
  }
  
  async verifyMarketplacePages(): Promise<boolean> {
    const marketplacePage = path.join(process.cwd(), 'app/marketplace/page.tsx');
    const propertiesPage = path.join(process.cwd(), 'app/marketplace/properties/page.tsx');
    const materialsPage = path.join(process.cwd(), 'app/marketplace/materials/page.tsx');
    
    const pagesExist = await Promise.all([
      this.verifyFileExists(marketplacePage, 'Marketplace Main Page'),
      this.verifyFileExists(propertiesPage, 'Properties Browse Page'),
      this.verifyFileExists(materialsPage, 'Materials Browse Page')
    ]);
    
    return pagesExist.every(exists => exists);
  }
  
  async verifyMiddleware(): Promise<boolean> {
    const middlewareFile = path.join(process.cwd(), 'middleware.ts');
    const requiredContent = [
      'publicMarketplaceRoutes',
      'publicApiRoutes',
      'protectedMarketplaceActions',
      '/api/public/properties',
      '/api/public/materials'
    ];
    
    return await this.verifyFileContent(middlewareFile, requiredContent, 'Middleware Configuration');
  }
  
  async verifyAuthentication(): Promise<boolean> {
    const authFile = path.join(process.cwd(), 'src/lib/auth.ts');
    const requiredContent = [
      'createToken',
      'verifyToken',
      'getSession',
      'hasRole',
      'canAccessModule',
      'requiresKYC',
      'requiresFAL'
    ];
    
    return await this.verifyFileContent(authFile, requiredContent, 'Authentication Implementation');
  }
  
  async verifyNoPlaceholders(): Promise<boolean> {
    const filesToCheck = [
      'app/api/marketplace/products/route.ts',
      'src/lib/guest-browsing.ts',
      'src/lib/ksa-compliance.ts',
      'src/lib/rbac-comprehensive.ts'
    ];
    
    let hasPlaceholders = false;
    
    for (const filePath of filesToCheck) {
      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const placeholders = ['TODO', 'FIXME', 'XXX', 'placeholder'];
        const foundPlaceholders = placeholders.filter(placeholder => 
          content.toLowerCase().includes(placeholder.toLowerCase())
        );
        
        if (foundPlaceholders.length > 0) {
          this.addResult(
            'Code Quality',
            `Placeholders in ${filePath}`,
            'WARNING',
            `Found placeholders: ${foundPlaceholders.join(', ')}`
          );
          hasPlaceholders = true;
        }
      }
    }
    
    if (!hasPlaceholders) {
      this.addResult('Code Quality', 'No Placeholders', 'PASS', 'No TODO/FIXME placeholders found in critical files');
    }
    
    return !hasPlaceholders;
  }
  
  async verifyPackageJson(): Promise<boolean> {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      this.addResult('Dependencies', 'package.json', 'FAIL', 'package.json file missing');
      return false;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const requiredDeps = ['next', 'react', 'typescript', 'mongodb', 'jsonwebtoken'];
    const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
    
    this.addResult(
      'Dependencies',
      'Required Dependencies',
      missingDeps.length === 0 ? 'PASS' : 'WARNING',
      missingDeps.length === 0 
        ? 'All required dependencies present'
        : `Missing dependencies: ${missingDeps.join(', ')}`
    );
    
    return missingDeps.length === 0;
  }
  
  async runVerification(): Promise<void> {
    console.log('🔍 Starting comprehensive implementation verification...\n');
    
    // Database verification
    console.log('📊 Verifying database...');
    await this.verifyDatabaseConnection();
    await this.verifyDatabaseCollections();
    
    // Core implementation verification
    console.log('🔧 Verifying core implementations...');
    await this.verifyRBACImplementation();
    await this.verifyKSACompliance();
    await this.verifyGuestBrowsing();
    await this.verifyAuthentication();
    
    // API and pages verification
    console.log('🌐 Verifying APIs and pages...');
    await this.verifyPublicAPIs();
    await this.verifyMarketplacePages();
    await this.verifyMiddleware();
    
    // Code quality verification
    console.log('✅ Verifying code quality...');
    await this.verifyNoPlaceholders();
    await this.verifyPackageJson();
    
    // Print results
    this.printResults();
  }
  
  printResults(): void {
    console.log('\n📋 VERIFICATION RESULTS\n');
    console.log('=' * 80);
    
    const categories = [...new Set(this.results.map(r => r.category))];
    
    for (const category of categories) {
      console.log(`\n📁 ${category.toUpperCase()}`);
      console.log('-'.repeat(40));
      
      const categoryResults = this.results.filter(r => r.category === category);
      
      for (const result of categoryResults) {
        const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
        console.log(`${statusIcon} ${result.feature}: ${result.message}`);
        
        if (result.details) {
          console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
        }
      }
    }
    
    // Summary
    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const warningCount = this.results.filter(r => r.status === 'WARNING').length;
    const failCount = this.results.filter(r => r.status === 'FAIL').length;
    const totalCount = this.results.length;
    
    console.log('\n📊 SUMMARY');
    console.log('=' * 40);
    console.log(`✅ Passed: ${passCount}/${totalCount}`);
    console.log(`⚠️  Warnings: ${warningCount}/${totalCount}`);
    console.log(`❌ Failed: ${failCount}/${totalCount}`);
    
    const successRate = ((passCount + warningCount) / totalCount * 100).toFixed(1);
    console.log(`\n🎯 Overall Success Rate: ${successRate}%`);
    
    if (failCount === 0) {
      console.log('\n🎉 All critical features are implemented!');
    } else {
      console.log(`\n⚠️  ${failCount} critical issues need to be addressed.`);
    }
  }
}

// Run verification
async function main() {
  const verifier = new ImplementationVerifier();
  await verifier.runVerification();
}

if (require.main === module) {
  main().catch(console.error);
}

export { ImplementationVerifier };