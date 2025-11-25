import { readFileSync, writeFileSync } from "fs";
import fg from "fast-glob";

(async () => {
  const files = await fg([
    "**/*.{ts,tsx,js,jsx}",
    "!node_modules/**",
    "!.next/**",
  ]);
  let fixedCount = 0;

  for (const file of files) {
    try {
      let content = readFileSync(file, "utf-8");
      const original = content;

      // Fix all @/src/ imports
      content = content.replace(/@\/src\/lib\//g, "@/lib/");
      content = content.replace(/@\/src\/server\//g, "@/server/");
      content = content.replace(/@\/src\/models\//g, "@/models/");
      content = content.replace(/@\/src\/kb\//g, "@/kb/");

      if (content !== original) {
        writeFileSync(file, content, "utf-8");
        fixedCount++;
        if (fixedCount <= 10) console.log("Fixed: " + file);
      }
    } catch (e: unknown) {
      const error = e as { message?: string; stack?: string };
      console.error(`Failed to process ${file}:`, error?.message || String(e));
      if (error?.stack) console.error(error.stack);
    }
  }

  console.log("\n✅ Fixed " + fixedCount + " files");
})();
