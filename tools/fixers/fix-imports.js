// Import Path Fixer Script
const fs = require("fs");

console.log("�� Starting import path fixes...");

// Sample file to test - invoices route
const filePath = "./app/api/invoices/route.ts";
if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // Fix the main problematic imports
  const fixes = [
    ["@/lib/mongo", "@/lib/mongo"],
    ["@/server/", "@/server/"],
    ["@/lib/zatca", "@/lib/zatca"],
  ];

  fixes.forEach(([oldPath, newPath]) => {
    if (content.includes(oldPath)) {
      content = content.replace(new RegExp(oldPath, "g"), newPath);
      modified = true;
      console.log(`✅ Fixed ${oldPath} → ${newPath}`);
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log("✅ File updated successfully!");
  } else {
    console.log("ℹ️ No changes needed in test file");
  }
} else {
  console.log("File not found for testing");
}
