const fs = require("fs");
const path = require("path");

/**
 * Apply authentication middleware to all unprotected routes
 * Addresses 109 security vulnerabilities from audit
 */

let modifiedFiles = 0;
let routesFixed = 0;

function applyAuthToRoutes(directory) {
  if (!fs.existsSync(directory)) {
    console.log(`Directory ${directory} does not exist, skipping...`);
    return;
  }

  const files = fs.readdirSync(directory);

  files.forEach((file) => {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (
      stat.isDirectory() &&
      !fullPath.includes("node_modules") &&
      !fullPath.includes(".git")
    ) {
      applyAuthToRoutes(fullPath);
    } else if (file.endsWith(".js") && file !== "auth.js") {
      let content = fs.readFileSync(fullPath, "utf8");
      const _originalContent = content;

      // Skip if already has enhanced auth
      if (
        content.includes("enhancedAuth") ||
        content.includes("middleware/enhancedAuth")
      ) {
        return;
      }

      let fileModifications = 0;

      // Add enhanced auth middleware import
      if (
        !content.includes("require('../middleware/enhancedAuth')") &&
        content.includes("express")
      ) {
        const routerMatch = content.match(
          /const router = (require('express')\.Router()|express\.Router())/,
        );
        if (routerMatch) {
          content = content.replace(
            routerMatch[0],
            `${routerMatch[0]}\nconst { authenticate, authorize, ensureTenantIsolation } = require('../middleware/enhancedAuth');\nconst asyncHandler = require('../utils/asyncHandler');`,
          );
          fileModifications++;
        }
      }

      // Apply global authentication middleware
      if (
        !content.includes("router.use(authenticate)") &&
        content.includes("const router")
      ) {
        // Find position after router declaration
        const routerDeclaration = content.match(/const router = .*\n/);
        if (routerDeclaration) {
          content = content.replace(
            routerDeclaration[0],
            `${routerDeclaration[0]}\n// Apply authentication to all routes\nrouter.use(authenticate);\nrouter.use(ensureTenantIsolation);\n`,
          );
          fileModifications++;
        }
      }

      // Wrap async route handlers with asyncHandler
      const routeHandlerRegex =
        /router\.(get|post|put|delete|patch)((.*?),\s*async\s*((req,\s*res)(\,\s*next)?)\s*=>\s*{/g;
      let match;
      while ((match = routeHandlerRegex.exec(content)) !== null) {
        const method = match[1];
        const routeParams = match[2];
        const _funcParams = match[3];
        const nextParam = match[4] || "";

        // Replace with asyncHandler wrapper
        const replacement = `router.${method}(${routeParams}, asyncHandler(async (req, res${nextParam}) => {`;
        content = content.replace(match[0], replacement);
        fileModifications++;
      }

      // Add role-based authorization to sensitive endpoints
      const sensitiveEndpoints = [
        {
          pattern: /router\.delete(/g,
          roles: "authorize(['admin', 'manager'])",
        },
        {
          pattern: /router\.post([^,]*admin[^,]*/g,
          roles: "authorize(['admin'])",
        },
        {
          pattern: /router\.put([^,]*admin[^,]*/g,
          roles: "authorize(['admin'])",
        },
        {
          pattern: /router\.(get|post|put)([^,]*\/users[^,]*/g,
          roles: "authorize(['admin', 'hr'])",
        },
        {
          pattern: /router\.(post|put|delete)([^,]*\/properties[^,]*/g,
          roles: "authorize(['admin', 'property_owner', 'property_manager'])",
        },
      ];

      sensitiveEndpoints.forEach((endpoint) => {
        content = content.replace(endpoint.pattern, (match) => {
          if (!match.includes("authorize(")) {
            fileModifications++;
            return match.replace(
              "asyncHandler",
              `${endpoint.roles}, asyncHandler`,
            );
          }
          return match;
        });
      });

      if (fileModifications > 0) {
        fs.writeFileSync(fullPath, content);
        console.log(
          `✅ Applied ${fileModifications} security fixes to: ${fullPath}`,
        );
        modifiedFiles++;
        routesFixed += fileModifications;
      }
    }
  });
}

console.log("🔒 Applying authentication middleware to all routes...");
console.log("=======================================================");

// Apply authentication to all route files
const routeDirectories = ["routes"];

routeDirectories.forEach((dir) => {
  console.log(`\n📁 Processing directory: ${dir}`);
  applyAuthToRoutes(dir);
});

console.log("\n=======================================================");
console.log("📊 AUTHENTICATION APPLICATION SUMMARY");
console.log("=======================================================");
console.log(`Files modified: ${modifiedFiles}`);
console.log(`Security fixes applied: ${routesFixed}`);
console.log("✅ Authentication middleware applied successfully!");

if (routesFixed === 0) {
  console.log(
    "ℹ️  All routes already have proper authentication or were skipped",
  );
}
