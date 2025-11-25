import fg from "fast-glob";
import fs from "fs";
import pc from "picocolors";

console.log(pc.cyan("\n=== COMPREHENSIVE SYSTEM ASSESSMENT ===\n"));

const patterns = [
  "**/*.{ts,tsx,js,jsx}",
  "!node_modules/**",
  "!.next/**",
  "!_artifacts/**",
  "!packages/**",
];
const files = await fg(patterns);

console.log(pc.yellow("1. Code Statistics:"));
console.log(`   - Source files: ${files.length}`);

let totalLines = 0;
let commentedLines = 0;
let todoComments = 0;

for (const f of files) {
  const code = fs.readFileSync(f, "utf8");
  const lines = code.split("\n");
  totalLines += lines.length;
  commentedLines += lines.filter((l) => l.trim().startsWith("//")).length;
  todoComments += (
    code.match(/\/\/.*TODO|\/\/.*FIXME|\/\*.*TODO.*\*\//gi) || []
  ).length;
}

console.log(`   - Total lines: ${totalLines.toLocaleString()}`);
console.log(`   - Comment lines: ${commentedLines.toLocaleString()}`);
console.log(`   - TODO/FIXME comments: ${todoComments}`);

console.log(pc.yellow("\n2. Import Pattern Analysis:"));
let legacySrcImports = 0;
let modernLibImports = 0;

for (const f of files) {
  const code = fs.readFileSync(f, "utf8");
  legacySrcImports += (code.match(/from ['"]@\/src\//g) || []).length;
  modernLibImports += (code.match(/from ['"]@\/lib\//g) || []).length;
}

console.log(`   - Legacy @/src/ imports: ${legacySrcImports}`);
console.log(`   - Modern @/lib/ imports: ${modernLibImports}`);

console.log(pc.yellow("\n3. Dead Code Indicators:"));
let commentedCode = 0;

for (const f of files) {
  const code = fs.readFileSync(f, "utf8");
  const lines = code.split("\n");
  commentedCode += lines.filter((l) => {
    const t = l.trim();
    return (
      t.startsWith("// ") &&
      (t.includes("function") || t.includes("const ") || t.includes("export"))
    );
  }).length;
}

console.log(`   - Commented-out code lines: ${commentedCode}`);

console.log(pc.yellow("\n4. MongoDB Pattern Check:"));
let directMongoClient = 0;
let legacyMongoose = 0;

for (const f of files) {
  const code = fs.readFileSync(f, "utf8");
  if (code.includes("MongoClient.connect(")) directMongoClient++;
  if (code.includes("mongoose.connect(") && !f.includes("lib/mongo"))
    legacyMongoose++;
}

console.log(`   - Direct MongoClient.connect(): ${directMongoClient}`);
console.log(`   - Scattered mongoose.connect(): ${legacyMongoose}`);

console.log(pc.green("\n=== Assessment complete ===\n"));
