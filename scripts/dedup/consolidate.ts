#!/usr/bin/env tsx
import fs from "fs";
import path from "path";

const DRY = process.argv.includes("--dry");
console.log(DRY ? "DRY RUN - No changes will be made" : "APPLYING CHANGES");
console.log("Consolidation script ready");
