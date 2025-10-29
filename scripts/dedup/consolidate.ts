#!/usr/bin/env tsx

const DRY = process.argv.includes("--dry");
console.log(DRY ? "DRY RUN - No changes will be made" : "APPLYING CHANGES");
console.log("Consolidation script ready");
