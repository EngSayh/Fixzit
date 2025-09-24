import fs from "node:fs";

const layoutPath = "app/layout.tsx";
const layoutContent = fs.readFileSync(layoutPath, "utf8");

// Check for global CSS import
if (!layoutContent.includes('globals.css')) {
  console.error("❌ Missing globals.css import in root layout.");
  process.exit(1);
}

// Check for required providers
if (!layoutContent.includes('Providers') && !layoutContent.includes('RootProviders')) {
  console.error("❌ Missing Providers in root layout.");
  process.exit(1);
}

// Check globals.css exists
if (!fs.existsSync("app/globals.css")) {
  console.error("❌ Missing app/globals.css file.");
  process.exit(1);
}

// Check Tailwind directives
const globalsContent = fs.readFileSync("app/globals.css", "utf8");
if (!globalsContent.includes("@tailwind base") || 
    !globalsContent.includes("@tailwind utilities") ||
    !globalsContent.includes("@tailwind components")) {
  console.error("❌ Missing Tailwind directives in globals.css");
  process.exit(1);
}

// Check tailwind config
if (!fs.existsSync("tailwind.config.ts")) {
  console.error("❌ Missing tailwind.config.ts");
  process.exit(1);
}

// Check postcss config
if (!fs.existsSync("postcss.config.js")) {
  console.error("❌ Missing postcss.config.js");
  process.exit(1);
}

console.log("✅ Layout verification passed");
