// ================================================
// COMPLETE SYSTEM AUDIT SCANNER
// Finds ALL errors, placeholders, shortcuts, warnings, missing APIs
// ================================================

const fs = require("fs");
const path = require("path");
const axios = require("axios");

class SystemAuditScanner {
  constructor() {
    this.issues = {
      errors: [],
      placeholders: [],
      shortcuts: [],
      warnings: [],
      missingAPIs: [],
      duplicates: [],
      security: [],
      performance: [],
    };

    this.requiredEndpoints = this.getRequiredEndpoints();
    this.requiredModels = this.getRequiredModels();
  }

  // ==========================================
  // MAIN AUDIT FUNCTION
  // ==========================================
  async runCompleteAudit() {
    console.log("🔍 STARTING COMPLETE SYSTEM AUDIT...\n");
    console.log("=".repeat(80));

    // 1. Scan all source files
    await this.scanSourceFiles();

    // 2. Test all API endpoints
    await this.testAllEndpoints();

    // 3. Check database models
    await this.checkDatabaseModels();

    // 4. Verify business logic
    await this.verifyBusinessLogic();

    // 5. Security audit
    await this.securityAudit();

    // 6. Performance check
    await this.performanceCheck();

    // 7. Generate report
    this.generateReport();
  }

  // ==========================================
  // 1. SCAN SOURCE FILES
  // ==========================================
  async scanSourceFiles() {
    console.log("\n📁 SCANNING SOURCE FILES...\n");

    const directories = [
      "./routes",
      "./models",
      "./controllers",
      "./services",
      "./middleware",
      "./utils",
      "./config",
    ];

    for (const dir of directories) {
      if (fs.existsSync(dir)) {
        this.scanDirectory(dir);
      } else {
        this.issues.errors.push(`Missing directory: ${dir}`);
      }
    }
  }

  scanDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.scanDirectory(filePath);
      } else if (file.endsWith(".js") || file.endsWith(".ts")) {
        this.scanFile(filePath);
      }
    }
  }

  scanFile(filePath) {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for placeholders
      if (line.includes('{ message: "') || line.includes('{message: "')) {
        this.issues.placeholders.push({
          file: filePath,
          line: lineNum,
          code: line.trim(),
          issue: "Returns placeholder message instead of real data",
        });
      }

      // Check for TODO/FIXME
      if (line.includes("TODO") || line.includes("FIXME")) {
        this.issues.shortcuts.push({
          file: filePath,
          line: lineNum,
          code: line.trim(),
          issue: "Incomplete implementation",
        });
      }

      // Check for console.log (should use proper logging)
      if (line.includes("console.log") && !filePath.includes("test")) {
        this.issues.warnings.push({
          file: filePath,
          line: lineNum,
          code: line.trim(),
          issue: "Using console.log instead of proper logging",
        });
      }

      // Check for hardcoded values
      if (line.includes("localhost") || line.includes("127.0.0.1")) {
        this.issues.warnings.push({
          file: filePath,
          line: lineNum,
          code: line.trim(),
          issue: "Hardcoded localhost URL",
        });
      }

      // Check for missing error handling
      if (line.includes("await") && !this.hasErrorHandling(lines, index)) {
        this.issues.errors.push({
          file: filePath,
          line: lineNum,
          code: line.trim(),
          issue: "Missing try-catch for async operation",
        });
      }

      // Check for empty catch blocks
      if (line.includes("catch") && lines[index + 1]?.includes("}")) {
        this.issues.shortcuts.push({
          file: filePath,
          line: lineNum,
          code: line.trim(),
          issue: "Empty catch block - errors are silenced",
        });
      }

      // Check for missing authentication
      if (
        line.includes("router.post") ||
        line.includes("router.put") ||
        line.includes("router.delete")
      ) {
        if (
          !line.includes("authenticate") &&
          !lines[index - 1]?.includes("authenticate")
        ) {
          this.issues.security.push({
            file: filePath,
            line: lineNum,
            code: line.trim(),
            issue: "Endpoint missing authentication middleware",
          });
        }
      }

      // Check for SQL injection vulnerabilities
      if (
        line.includes("`SELECT") ||
        line.includes("`INSERT") ||
        line.includes("`UPDATE")
      ) {
        if (line.includes("${") && !line.includes("?")) {
          this.issues.security.push({
            file: filePath,
            line: lineNum,
            code: line.trim(),
            issue: "Potential SQL injection - use parameterized queries",
          });
        }
      }

      // Check for duplicate route definitions
      if (line.includes("router.get(") || line.includes("router.post(")) {
        const routeMatch = line.match(/['"](\/api\/[^'"]+)['"]/);
        if (routeMatch) {
          const route = routeMatch[1];
          if (this.routes && this.routes[route]) {
            this.issues.duplicates.push({
              file: filePath,
              line: lineNum,
              route,
              issue: `Duplicate route definition (also in ${this.routes[route]})`,
            });
          } else {
            this.routes = this.routes || {};
            this.routes[route] = `${filePath}:${lineNum}`;
          }
        }
      }
    });
  }

  hasErrorHandling(lines, index) {
    // Check if await is inside try-catch
    for (let i = index - 5; i <= index + 5; i++) {
      if (i >= 0 && i < lines.length) {
        if (lines[i].includes("try") || lines[i].includes("catch")) {
          return true;
        }
      }
    }
    return false;
  }

  // ==========================================
  // 2. TEST ALL API ENDPOINTS
  // ==========================================
  async testAllEndpoints() {
    console.log("\n🌐 TESTING ALL API ENDPOINTS...\n");

    for (const endpoint of this.requiredEndpoints) {
      try {
        const response = await axios({
          method: endpoint.method,
          url: `http://localhost:5000${endpoint.path}`,
          data: endpoint.testData,
          validateStatus: () => true,
        });

        // Check response quality
        if (response.status === 404) {
          this.issues.missingAPIs.push({
            endpoint: `${endpoint.method} ${endpoint.path}`,
            module: endpoint.module,
            issue: "Endpoint not implemented",
          });
        } else if (
          response.data?.message &&
          Object.keys(response.data).length === 1
        ) {
          this.issues.placeholders.push({
            endpoint: `${endpoint.method} ${endpoint.path}`,
            response: response.data,
            issue: "Returns placeholder message",
          });
        } else if (
          !this.validateResponse(response.data, endpoint.requiredFields)
        ) {
          this.issues.errors.push({
            endpoint: `${endpoint.method} ${endpoint.path}`,
            issue: "Missing required fields in response",
            missing: endpoint.requiredFields,
          });
        }
      } catch (error) {
        this.issues.errors.push({
          endpoint: `${endpoint.method} ${endpoint.path}`,
          error: error.message,
          issue: "Endpoint unreachable or erroring",
        });
      }
    }
  }

  validateResponse(data, requiredFields) {
    if (!requiredFields) return true;

    for (const field of requiredFields) {
      if (!this.hasField(data, field)) {
        return false;
      }
    }
    return true;
  }

  hasField(obj, field) {
    if (!obj) return false;

    // Handle nested fields like 'data._id'
    const parts = field.split(".");
    let current = obj;

    for (const part of parts) {
      if (!current[part]) return false;
      current = current[part];
    }

    return true;
  }

  // ==========================================
  // 3. CHECK DATABASE MODELS
  // ==========================================
  async checkDatabaseModels() {
    console.log("\n💾 CHECKING DATABASE MODELS...\n");

    for (const model of this.requiredModels) {
      const modelPath = `./models/${model.name}.js`;

      if (!fs.existsSync(modelPath)) {
        this.issues.missingAPIs.push({
          model: model.name,
          issue: "Model file not found",
        });
        continue;
      }

      const content = fs.readFileSync(modelPath, "utf8");

      // Check for required fields
      for (const field of model.requiredFields) {
        if (!content.includes(field)) {
          this.issues.errors.push({
            model: model.name,
            field,
            issue: "Required field missing from model schema",
          });
        }
      }

      // Check for proper indexing
      if (!content.includes(".index(")) {
        this.issues.performance.push({
          model: model.name,
          issue: "No indexes defined - will cause performance issues",
        });
      }

      // Check for timestamps
      if (!content.includes("timestamps: true")) {
        this.issues.warnings.push({
          model: model.name,
          issue: "Missing timestamps (createdAt, updatedAt)",
        });
      }
    }
  }

  // ==========================================
  // 4. VERIFY BUSINESS LOGIC
  // ==========================================
  async verifyBusinessLogic() {
    console.log("\n⚙️ VERIFYING BUSINESS LOGIC...\n");

    // Check Work Order SLA calculation
    if (!this.checkFileContains("./routes/workorders.js", "calculateSLA")) {
      this.issues.errors.push({
        feature: "Work Order SLA",
        issue: "SLA calculation not implemented",
      });
    }

    // Check ZATCA QR generation
    if (!this.checkFileContains("./services/ZATCAService.js", "encodeTLV")) {
      this.issues.errors.push({
        feature: "ZATCA QR Code",
        issue: "TLV encoding not implemented - LEGALLY REQUIRED!",
      });
    }

    // Check Property Owner features
    if (!fs.existsSync("./routes/owner.js")) {
      this.issues.errors.push({
        feature: "Property Owner Dashboard",
        issue: "Property Owner routes not implemented - CRITICAL!",
      });
    }

    // Check Subscription system
    if (!this.checkFileContains("./models/Organization.js", "subscription")) {
      this.issues.errors.push({
        feature: "Subscription System",
        issue: "Subscription management not implemented - HOW YOU MAKE MONEY!",
      });
    }

    // Check DoA system
    if (!fs.existsSync("./models/DoARule.js")) {
      this.issues.errors.push({
        feature: "DoA System",
        issue: "Delegation of Authority not implemented",
      });
    }

    // Check Deputy system
    if (!this.checkFileContains("./models/Property.js", "deputyId")) {
      this.issues.errors.push({
        feature: "Deputy System",
        issue: "Deputy assignment not implemented",
      });
    }
  }

  checkFileContains(filePath, searchString) {
    if (!fs.existsSync(filePath)) return false;
    const content = fs.readFileSync(filePath, "utf8");
    return content.includes(searchString);
  }

  // ==========================================
  // 5. SECURITY AUDIT
  // ==========================================
  async securityAudit() {
    console.log("\n🔒 SECURITY AUDIT...\n");

    // Check for exposed secrets
    const configFiles = ["./config.js", "./.env", "./server.js"];

    for (const file of configFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, "utf8");

        // Check for hardcoded secrets
        if (
          content.includes("secret") &&
          content.includes('"') &&
          !content.includes("process.env")
        ) {
          this.issues.security.push({
            file,
            issue: "Hardcoded secret key detected",
          });
        }

        // Check for exposed API keys
        if (content.match(/['"][A-Za-z0-9]{32,}['"]/)) {
          this.issues.security.push({
            file,
            issue: "Potential exposed API key",
          });
        }
      }
    }

    // Check for rate limiting
    if (!fs.existsSync("./middleware/rateLimit.js")) {
      this.issues.security.push({
        feature: "Rate Limiting",
        issue: "No rate limiting implemented - vulnerable to DoS attacks",
      });
    }

    // Check for CORS configuration
    if (!this.checkFileContains("./server.js", "cors")) {
      this.issues.security.push({
        feature: "CORS",
        issue: "CORS not configured - security vulnerability",
      });
    }
  }

  // ==========================================
  // 6. PERFORMANCE CHECK
  // ==========================================
  async performanceCheck() {
    console.log("\n⚡ PERFORMANCE CHECK...\n");

    // Check for missing pagination
    const routeFiles = fs.readdirSync("./routes");
    for (const file of routeFiles) {
      const content = fs.readFileSync(`./routes/${file}`, "utf8");
      if (content.includes(".find(") && !content.includes(".limit(")) {
        this.issues.performance.push({
          file: `./routes/${file}`,
          issue: "Missing pagination - will load all records",
        });
      }
    }

    // Check for missing caching
    if (!fs.existsSync("./middleware/cache.js")) {
      this.issues.performance.push({
        feature: "Caching",
        issue: "No caching implemented - performance issues",
      });
    }

    // Check for missing database connection pooling
    if (!this.checkFileContains("./config/database.js", "poolSize")) {
      this.issues.performance.push({
        feature: "Database",
        issue: "No connection pooling configured",
      });
    }
  }

  // ==========================================
  // GENERATE REPORT
  // ==========================================
  generateReport() {
    console.log("\n" + "=".repeat(80));
    console.log("📊 SYSTEM AUDIT REPORT");
    console.log("=".repeat(80) + "\n");

    const totalIssues = Object.values(this.issues).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );

    console.log(`🔴 TOTAL ISSUES FOUND: ${totalIssues}\n`);

    // Critical Errors
    if (this.issues.errors.length > 0) {
      console.log(`\n❌ CRITICAL ERRORS (${this.issues.errors.length}):`);
      console.log("-".repeat(80));
      this.issues.errors.forEach((error, i) => {
        console.log(`${i + 1}. ${JSON.stringify(error, null, 2)}`);
      });
    }

    // Security Issues
    if (this.issues.security.length > 0) {
      console.log(`\n🔒 SECURITY ISSUES (${this.issues.security.length}):`);
      console.log("-".repeat(80));
      this.issues.security.forEach((issue, i) => {
        console.log(`${i + 1}. ${JSON.stringify(issue, null, 2)}`);
      });
    }

    // Missing APIs
    if (this.issues.missingAPIs.length > 0) {
      console.log(`\n📡 MISSING APIs (${this.issues.missingAPIs.length}):`);
      console.log("-".repeat(80));
      this.issues.missingAPIs.forEach((api, i) => {
        console.log(`${i + 1}. ${JSON.stringify(api, null, 2)}`);
      });
    }

    // Placeholders
    if (this.issues.placeholders.length > 0) {
      console.log(
        `\n📝 PLACEHOLDER RESPONSES (${this.issues.placeholders.length}):`,
      );
      console.log("-".repeat(80));
      this.issues.placeholders.forEach((placeholder, i) => {
        console.log(`${i + 1}. ${JSON.stringify(placeholder, null, 2)}`);
      });
    }

    // Performance Issues
    if (this.issues.performance.length > 0) {
      console.log(
        `\n⚡ PERFORMANCE ISSUES (${this.issues.performance.length}):`,
      );
      console.log("-".repeat(80));
      this.issues.performance.forEach((perf, i) => {
        console.log(`${i + 1}. ${JSON.stringify(perf, null, 2)}`);
      });
    }

    // Shortcuts
    if (this.issues.shortcuts.length > 0) {
      console.log(
        `\n⚠️ INCOMPLETE IMPLEMENTATIONS (${this.issues.shortcuts.length}):`,
      );
      console.log("-".repeat(80));
      this.issues.shortcuts.slice(0, 10).forEach((shortcut, i) => {
        console.log(`${i + 1}. ${JSON.stringify(shortcut, null, 2)}`);
      });
      if (this.issues.shortcuts.length > 10) {
        console.log(`... and ${this.issues.shortcuts.length - 10} more`);
      }
    }

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 SUMMARY:");
    console.log("=".repeat(80));
    console.log(`Critical Errors: ${this.issues.errors.length}`);
    console.log(`Security Issues: ${this.issues.security.length}`);
    console.log(`Missing APIs: ${this.issues.missingAPIs.length}`);
    console.log(`Placeholder Responses: ${this.issues.placeholders.length}`);
    console.log(`Performance Issues: ${this.issues.performance.length}`);
    console.log(`Incomplete Implementations: ${this.issues.shortcuts.length}`);
    console.log(`Warnings: ${this.issues.warnings.length}`);
    console.log(`Duplicate Routes: ${this.issues.duplicates.length}`);

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      totalIssues,
      issues: this.issues,
    };

    fs.writeFileSync("./audit-report.json", JSON.stringify(report, null, 2));
    console.log("\n✅ Full report saved to audit-report.json");
  }

  // ==========================================
  // REQUIRED ENDPOINTS & MODELS
  // ==========================================
  getRequiredEndpoints() {
    return [
      // Property Owner endpoints
      {
        method: "GET",
        path: "/api/owner/dashboard",
        module: "Owner",
        requiredFields: ["revenue", "expenses", "properties"],
      },
      {
        method: "POST",
        path: "/api/owner/properties/:id/deputy",
        module: "Owner",
        requiredFields: ["deputyId"],
      },

      // Work Order endpoints
      {
        method: "GET",
        path: "/api/workorders",
        module: "WorkOrder",
        requiredFields: ["data"],
      },
      {
        method: "POST",
        path: "/api/workorders",
        module: "WorkOrder",
        requiredFields: ["_id", "workOrderNumber"],
      },

      // Finance endpoints
      {
        method: "GET",
        path: "/api/finance/invoices",
        module: "Finance",
        requiredFields: ["data"],
      },
      {
        method: "POST",
        path: "/api/zatca/qr/:id",
        module: "Finance",
        requiredFields: ["qrCode"],
      },

      // Dashboard endpoints
      {
        method: "GET",
        path: "/api/dashboard/kpis",
        module: "Dashboard",
        requiredFields: ["revenue", "workOrders"],
      },

      // Subscription endpoints
      {
        method: "GET",
        path: "/api/subscription/current",
        module: "Subscription",
        requiredFields: ["plan", "status"],
      },
      {
        method: "POST",
        path: "/api/subscription/upgrade",
        module: "Subscription",
        requiredFields: ["success"],
      },
    ];
  }

  getRequiredModels() {
    return [
      { name: "User", requiredFields: ["property_owner", "deputy", "tenant"] },
      {
        name: "WorkOrder",
        requiredFields: ["propertyId", "slaBreachTime", "costTracking"],
      },
      { name: "Property", requiredFields: ["ownerId", "maintenanceHistory"] },
      {
        name: "Deputy",
        requiredFields: ["propertyOwnerId", "permissions", "approvalLimit"],
      },
      {
        name: "Subscription",
        requiredFields: ["organizationId", "plan", "limits"],
      },
      { name: "DoA", requiredFields: ["approvalChain", "workflowType"] },
    ];
  }
}

// ==========================================
// RUN THE AUDIT
// ==========================================
const scanner = new SystemAuditScanner();
scanner.runCompleteAudit().catch((err) => {
  console.error('System audit failed:', err);
  process.exit(1);
});
