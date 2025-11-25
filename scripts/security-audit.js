#!/usr/bin/env node
// ==============================================================
// FIXZIT SOUQ SECURITY AUDIT SCRIPT
// Verifies all critical security fixes are properly implemented
// ==============================================================

const fs = require("fs");
const path = require("path");

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const auditResults = {
  timestamp: new Date().toISOString(),
  criticalIssues: 0,
  securityScore: 0,
  checks: [],
};

function addCheck(name, status, severity, message) {
  const check = { name, status, severity, message };
  auditResults.checks.push(check);

  if (!status && severity === "critical") {
    auditResults.criticalIssues++;
  }

  const statusColor = status ? colors.green + "✅" : colors.red + "❌";
  const severityColor =
    severity === "critical"
      ? colors.red
      : severity === "high"
        ? colors.yellow
        : colors.cyan;

  console.log(
    `${statusColor} ${severityColor}[${severity.toUpperCase()}]${colors.reset} ${name}: ${message}`,
  );
}

console.log(
  colors.bright + colors.cyan + "🔐 FIXZIT SOUQ SECURITY AUDIT" + colors.reset,
);
console.log("═══════════════════════════════════════════════════════");

// 1. Check JWT Secret Security
console.log(
  "\n" + colors.bright + "1. JWT Security Configuration" + colors.reset,
);
try {
  require("dotenv").config();
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    addCheck(
      "JWT_SECRET_EXISTS",
      false,
      "critical",
      "JWT_SECRET not found in environment",
    );
  } else if (jwtSecret.length < 32) {
    addCheck(
      "JWT_SECRET_LENGTH",
      false,
      "critical",
      `JWT secret too short (${jwtSecret.length} chars, need 32+)`,
    );
  } else if (
    jwtSecret === "your-secret-key-here" ||
    jwtSecret.includes("change") ||
    jwtSecret.includes("default")
  ) {
    addCheck(
      "JWT_SECRET_DEFAULT",
      false,
      "critical",
      "JWT secret appears to be default/placeholder value",
    );
  } else {
    addCheck(
      "JWT_SECRET_SECURE",
      true,
      "critical",
      `JWT secret is secure (${jwtSecret.length} characters)`,
    );
  }
} catch (error) {
  addCheck(
    "JWT_CONFIG_ERROR",
    false,
    "critical",
    `Error checking JWT config: ${error.message}`,
  );
}

// 2. Check Authentication Middleware
console.log(
  "\n" + colors.bright + "2. Authentication Middleware" + colors.reset,
);
try {
  const authPath = path.join(__dirname, "middleware", "auth.js");
  if (!fs.existsSync(authPath)) {
    addCheck(
      "AUTH_MIDDLEWARE_EXISTS",
      false,
      "critical",
      "Authentication middleware file not found",
    );
  } else {
    const authContent = fs.readFileSync(authPath, "utf8");

    // Check for database verification
    if (
      authContent.includes("User.findById") &&
      authContent.includes("decoded.userId")
    ) {
      addCheck(
        "AUTH_DB_VERIFICATION",
        true,
        "critical",
        "Database verification implemented in auth middleware",
      );
    } else {
      addCheck(
        "AUTH_DB_VERIFICATION",
        false,
        "critical",
        "Missing database user verification in auth middleware",
      );
    }

    // Check for query parameter token blocking
    if (!authContent.includes("req.query.token")) {
      addCheck(
        "AUTH_NO_QUERY_TOKENS",
        true,
        "high",
        "Query parameter tokens properly blocked",
      );
    } else {
      addCheck(
        "AUTH_NO_QUERY_TOKENS",
        false,
        "high",
        "Still accepting tokens from query parameters (security risk)",
      );
    }

    // Check for JWT fallback removal
    if (
      !authContent.includes("default-secret") &&
      !authContent.includes("fallback")
    ) {
      addCheck(
        "AUTH_NO_FALLBACK",
        true,
        "critical",
        "JWT fallback properly removed",
      );
    } else {
      addCheck(
        "AUTH_NO_FALLBACK",
        false,
        "critical",
        "JWT fallback still present",
      );
    }
  }
} catch (error) {
  addCheck(
    "AUTH_CHECK_ERROR",
    false,
    "high",
    `Error checking auth middleware: ${error.message}`,
  );
}

// 3. Check Input Validation
console.log(
  "\n" + colors.bright + "3. Input Validation Security" + colors.reset,
);
try {
  const validationPath = path.join(__dirname, "middleware", "validation.js");
  if (!fs.existsSync(validationPath)) {
    addCheck(
      "VALIDATION_MIDDLEWARE_EXISTS",
      false,
      "high",
      "Validation middleware not found",
    );
  } else {
    const validationContent = fs.readFileSync(validationPath, "utf8");

    // Check for XSS protection
    if (
      validationContent.includes("xss") &&
      validationContent.includes("deepSanitize")
    ) {
      addCheck(
        "XSS_PROTECTION",
        true,
        "high",
        "XSS protection with deep sanitization implemented",
      );
    } else {
      addCheck(
        "XSS_PROTECTION",
        false,
        "high",
        "Missing comprehensive XSS protection",
      );
    }

    // Check for NoSQL injection prevention
    if (
      validationContent.includes("preventNoSQLInjection") &&
      validationContent.includes("$where")
    ) {
      addCheck(
        "NOSQL_INJECTION_PROTECTION",
        true,
        "high",
        "NoSQL injection prevention implemented",
      );
    } else {
      addCheck(
        "NOSQL_INJECTION_PROTECTION",
        false,
        "high",
        "Missing NoSQL injection prevention",
      );
    }
  }
} catch (error) {
  addCheck(
    "VALIDATION_CHECK_ERROR",
    false,
    "high",
    `Error checking validation: ${error.message}`,
  );
}

// 4. Check Package Dependencies
console.log(
  "\n" + colors.bright + "4. Security Package Dependencies" + colors.reset,
);
try {
  const packagePath = path.join(__dirname, "package.json");
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const securityPackages = [
      "helmet",
      "express-rate-limit",
      "express-validator",
      "xss",
      "bcryptjs",
    ];
    let installedCount = 0;

    securityPackages.forEach((pkg) => {
      if (dependencies[pkg]) {
        installedCount++;
      }
    });

    if (installedCount === securityPackages.length) {
      addCheck(
        "SECURITY_PACKAGES",
        true,
        "medium",
        `All ${securityPackages.length} security packages installed`,
      );
    } else {
      addCheck(
        "SECURITY_PACKAGES",
        false,
        "medium",
        `Missing security packages (${installedCount}/${securityPackages.length} installed)`,
      );
    }
  }
} catch (error) {
  addCheck(
    "PACKAGE_CHECK_ERROR",
    false,
    "medium",
    `Error checking packages: ${error.message}`,
  );
}

// 5. Check Environment Security
console.log(
  "\n" + colors.bright + "5. Environment Configuration" + colors.reset,
);
try {
  if (fs.existsSync(".env")) {
    const envContent = fs.readFileSync(".env", "utf8");

    if (envContent.includes("NODE_ENV=production")) {
      addCheck(
        "PRODUCTION_MODE",
        true,
        "medium",
        "Application configured for production mode",
      );
    } else {
      addCheck(
        "PRODUCTION_MODE",
        false,
        "medium",
        "Application not in production mode",
      );
    }

    // Check for .env in .gitignore
    if (fs.existsSync(".gitignore")) {
      const gitignoreContent = fs.readFileSync(".gitignore", "utf8");
      if (gitignoreContent.includes(".env")) {
        addCheck(
          "ENV_GITIGNORE",
          true,
          "medium",
          ".env file properly excluded from git",
        );
      } else {
        addCheck(
          "ENV_GITIGNORE",
          false,
          "high",
          ".env file not excluded from git (security risk)",
        );
      }
    }
  } else {
    addCheck("ENV_FILE_EXISTS", false, "high", ".env file not found");
  }
} catch (error) {
  addCheck(
    "ENV_CHECK_ERROR",
    false,
    "medium",
    `Error checking environment: ${error.message}`,
  );
}

// Calculate security score
const totalChecks = auditResults.checks.length;
const passedChecks = auditResults.checks.filter((c) => c.status).length;
auditResults.securityScore =
  totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

// Display results
console.log(
  "\n" +
    colors.bright +
    colors.cyan +
    "🎯 SECURITY AUDIT RESULTS" +
    colors.reset,
);
console.log("═══════════════════════════════════════════════════════");
console.log(
  `📊 Security Score: ${auditResults.securityScore >= 80 ? colors.green : auditResults.securityScore >= 60 ? colors.yellow : colors.red}${auditResults.securityScore}%${colors.reset}`,
);
console.log(
  `✅ Passed Checks: ${colors.green}${passedChecks}${colors.reset}/${totalChecks}`,
);
console.log(
  `🚨 Critical Issues: ${auditResults.criticalIssues > 0 ? colors.red : colors.green}${auditResults.criticalIssues}${colors.reset}`,
);

if (auditResults.criticalIssues === 0 && auditResults.securityScore >= 80) {
  console.log(
    "\n" +
      colors.green +
      colors.bright +
      "🎉 SECURITY STATUS: EXCELLENT" +
      colors.reset,
  );
  console.log(
    colors.green +
      "   Your Fixzit Souq platform is properly secured!" +
      colors.reset,
  );
} else if (auditResults.criticalIssues === 0) {
  console.log(
    "\n" +
      colors.yellow +
      colors.bright +
      "⚠️  SECURITY STATUS: GOOD" +
      colors.reset,
  );
  console.log(
    colors.yellow +
      "   Most security measures implemented, minor improvements needed" +
      colors.reset,
  );
} else {
  console.log(
    "\n" +
      colors.red +
      colors.bright +
      "🚨 SECURITY STATUS: CRITICAL ISSUES FOUND" +
      colors.reset,
  );
  console.log(
    colors.red +
      "   Immediate action required to fix critical vulnerabilities!" +
      colors.reset,
  );
}

// Save detailed report
const reportFile = `security-audit-${new Date().toISOString().split("T")[0]}.json`;
fs.writeFileSync(reportFile, JSON.stringify(auditResults, null, 2));
console.log(`\n📄 Detailed report saved to: ${reportFile}`);

process.exit(auditResults.criticalIssues > 0 ? 1 : 0);
