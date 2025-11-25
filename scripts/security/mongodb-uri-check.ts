#!/usr/bin/env tsx
import { getValidatedMongoUri } from "@/lib/mongo-uri-validator";

async function main() {
  try {
    const uri = getValidatedMongoUri();
    console.log(`SUCCESS:${uri}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAILED:${message}`);
    process.exit(1);
  }
}

void main();
