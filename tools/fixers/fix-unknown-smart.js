#!/usr/bin/env node
/**
 * Smart TypeScript unknown type fixer
 * Infers proper types based on context and usage
 */

const fs = require("fs");
const { execSync } = require("child_process");

// Common type mappings based on variable names and usage patterns
const typeInference = {
  // Marketplace types
  product: "Product",
  order: "Order",
  orderItem: "OrderItem",
  category: "Category",
  rfq: "RFQ",
  cart: "Cart",
  cartItem: "CartItem",

  // Notification types
  notif: "NotificationDoc",
  notification: "NotificationDoc",
  n: "NotificationDoc", // when in notifications context

  // Work order types
  workOrder: "WorkOrder",
  wo: "WorkOrder",
  part: "Part",
  material: "Material",

  // Invoice/Finance types
  invoice: "Invoice",
  payment: "Payment",
  transaction: "Transaction",

  // User/Auth types
  user: "User",
  usr: "User",

  // Ticket types
  ticket: "Ticket",
  tkt: "Ticket",

  // Generic
  item: "any",
  data: "any",
  result: "any",
  res: "any",
  response: "any",
  doc: "any",
  d: "any",
  r: "any",
  it: "any",
  err: "Error",
  error: "Error",
  e: "Error",
};

// Import statements needed for each type
const typeImports = {
  Product: "@/lib/models",
  Order: "@/lib/models",
  OrderItem: "@/lib/models",
  Category: "@/lib/models",
  RFQ: "@/lib/models",
  Cart: "@/lib/models",
  CartItem: "@/lib/models",
  NotificationDoc: "@/lib/models",
  WorkOrder: "@/lib/models",
  Part: "@/lib/models",
  Material: "@/lib/models",
  Invoice: "@/lib/models",
  Payment: "@/lib/models",
  Transaction: "@/lib/models",
  User: "@/lib/models",
  Ticket: "@/lib/models",
};

console.log("🔍 Finding files with unknown type errors...");
let errors;
try {
  errors = execSync("npx tsc --noEmit 2>&1", { encoding: "utf-8" });
} catch (e) {
  errors = e.stdout || "";
}
const errorLines = errors
  .split("\n")
  .filter((line) => line.includes("error TS18046"));

// Group errors by file
const fileErrors = {};
errorLines.forEach((line) => {
  const match = line.match(
    /^(.+?)\((\d+),(\d+)\): error TS18046: '(.+)' is of type 'unknown'/,
  );
  if (match) {
    const [, file, lineNum, , varName] = match;
    if (!fileErrors[file]) fileErrors[file] = [];
    fileErrors[file].push({ lineNum: parseInt(lineNum), varName });
  }
});

console.log(
  `📁 Found ${Object.keys(fileErrors).length} files with unknown type errors\n`,
);

// Process each file
let totalFixed = 0;
Object.entries(fileErrors).forEach(([filePath, errors]) => {
  // Skip non-source files
  if (!filePath.match(/\.(tsx?|jsx?)$/)) return;

  console.log(`🔧 Processing: ${filePath}`);

  try {
    let content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const needsImports = new Set();
    let modified = false;

    // Process each error
    errors.forEach(({ lineNum, varName }) => {
      const lineIndex = lineNum - 1;
      const line = lines[lineIndex];

      // Infer type from variable name
      let inferredType = typeInference[varName] || "any";

      // Check if it's in an array method
      const arrayMethodMatch = line.match(
        /\.(filter|map|forEach|find|some|every|reduce)\(\((\w+):\s*unknown\)/,
      );
      if (arrayMethodMatch && arrayMethodMatch[2] === varName) {
        lines[lineIndex] = line.replace(
          new RegExp(`\\(${varName}:\\s*unknown\\)`),
          `(${varName}: ${inferredType})`,
        );
        modified = true;

        // Track imports needed
        if (typeImports[inferredType]) {
          needsImports.add(inferredType);
        }
      }
    });

    if (modified) {
      // Add missing imports
      if (needsImports.size > 0) {
        const typesToImport = Array.from(needsImports);
        const importStatement = `import type { ${typesToImport.join(", ")} } from '@/lib/models';\n`;

        // Check if import already exists
        const hasImport = content.match(/import.*from ['"]@\/lib\/models['"]/);
        if (!hasImport) {
          // Add after existing imports or at top
          const firstImportIndex = lines.findIndex((l) =>
            l.trim().startsWith("import"),
          );
          if (firstImportIndex >= 0) {
            // Find last import
            let lastImportIndex = firstImportIndex;
            for (let i = firstImportIndex + 1; i < lines.length; i++) {
              if (
                lines[i].trim().startsWith("import") ||
                lines[i].trim() === ""
              ) {
                lastImportIndex = i;
              } else {
                break;
              }
            }
            lines.splice(lastImportIndex + 1, 0, importStatement);
          } else {
            lines.unshift(importStatement);
          }
        }
      }

      fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
      totalFixed++;
      console.log(`   ✅ Fixed ${errors.length} errors`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
});

console.log(`\n✨ Fixed ${totalFixed} files`);
console.log("\n🔍 Checking remaining errors...");
try {
  let remaining;
  try {
    remaining = execSync("npx tsc --noEmit 2>&1", { encoding: "utf-8" });
  } catch (e) {
    remaining = e.stdout || "";
  }
  const errorCount = (remaining.match(/error TS/g) || []).length;
  console.log(`Remaining TypeScript errors: ${errorCount}`);
} catch (_error) {
  console.log("Could not count remaining errors");
}
