/**
 * System Scan Script for Fixzit AI Knowledge Base
 * Automatically scans Blueprint PDFs and populates ai_kb MongoDB collection
 *
 * Features:
 * - PDF parsing with pdf-parse
 * - Text chunking for RAG optimization
 * - Scheduled via node-cron (nightly at 2 AM)
 * - Incremental updates (detects file changes via hash)
 *
 * Usage:
 *   pnpm tsx scripts/ai/systemScan.ts           # One-time scan
 *   pnpm tsx scripts/ai/systemScan.ts --daemon  # Run as daemon with cron
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as cron from "node-cron";
import { db } from "@/lib/mongo";
import { logger } from "@/lib/logger";

// Documents to scan (from your Blueprint/Design System PDFs)
// Note: Only .pdf files are supported. .docx files will be skipped.
const DOCUMENTS = [
  "Monday options and workflow and system structure.pdf",
  "Fixzit Blue Print.pdf",
  "Targeted software layout for FM moduel.pdf",
  "Fixzit Blueprint Bible – vFinal.pdf",
  "Fixzit Facility Management Platform_ Complete Implementation Guide.pdf",
  "Fixzit_Master_Design_System.pdf",
  // Fallback: Use existing PDFs if Blueprints not available
  "public/docs/msds/nitrile-gloves.pdf",
  "public/docs/msds/merv13.pdf",
];

// Try multiple possible document locations
const DOCS_DIRS = [
  path.resolve(process.cwd(), "docs"),
  path.resolve(process.cwd(), "."),
  path.resolve(process.cwd(), "public/docs"),
];

const CHUNK_SIZE = 1000; // Characters per chunk for RAG
const CHUNK_OVERLAP = 200; // Overlap between chunks to preserve context

interface KnowledgeBaseEntry {
  title: string;
  source: string;
  text: string;
  hash: string;
  chunk: number;
  totalChunks: number;
  roles: string[] | null; // null = public
  orgId: string | null; // null = public
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Calculates MD5 hash of file content for change detection
 */
function calculateFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("md5").update(content).digest("hex");
}

/**
 * Splits text into overlapping chunks for RAG
 */
function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

/**
 * Scans a single PDF document and upserts to ai_kb collection
 */
async function scanDocument(filename: string): Promise<number> {
  // Try multiple locations for the file
  let fullPath: string | null = null;

  // Check if filename already includes path (e.g., public/docs/msds/...)
  if (filename.includes("/")) {
    const candidatePath = path.resolve(process.cwd(), filename);
    if (fs.existsSync(candidatePath)) {
      fullPath = candidatePath;
    }
  }

  // Otherwise try each docs directory
  if (!fullPath) {
    for (const dir of DOCS_DIRS) {
      const candidatePath = path.join(dir, filename);
      if (fs.existsSync(candidatePath)) {
        fullPath = candidatePath;
        break;
      }
    }
  }

  // Skip if file doesn't exist anywhere
  if (!fullPath) {
    logger.info(`[systemScan] Skipped missing file: ${filename}`);
    return 0;
  }

  // Skip non-PDF files (pdf-parse only handles PDFs)
  if (!filename.toLowerCase().endsWith(".pdf")) {
    logger.info(`[systemScan] Skipped non-PDF file: ${filename}`);
    return 0;
  }

  try {
    const pdfParse = (await import("pdf-parse")).default as (
      _data: Buffer,
    ) => Promise<{ text: string }>;
    const fileHash = calculateFileHash(fullPath);
    const database = await db;
    const collection = database.collection("ai_kb");

    // Check if document already processed with same hash
    const existing = await collection.findOne({
      source: filename,
      hash: fileHash,
    });
    if (existing) {
      logger.info(`[systemScan] Skipped unchanged file: ${filename}`);
      return 0;
    }

    // Parse PDF
    const dataBuffer = fs.readFileSync(fullPath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    if (!text || text.trim().length === 0) {
      logger.warn(`[systemScan] Empty PDF: ${filename}`);
      return 0;
    }

    // Delete old chunks for this document
    await collection.deleteMany({ source: filename });

    // Chunk text
    const chunks = chunkText(text);

    // Insert chunks
    const entries: KnowledgeBaseEntry[] = chunks.map((chunk, idx) => ({
      title: filename.replace(".pdf", ""),
      source: filename,
      text: chunk,
      hash: fileHash,
      chunk: idx + 1,
      totalChunks: chunks.length,
      roles: null, // Public knowledge (all roles can access)
      orgId: null, // Public knowledge (not tenant-scoped)
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await collection.insertMany(
      entries as unknown as Record<string, unknown>[],
    );

    logger.info(
      `[systemScan] Processed ${filename}: ${chunks.length} chunks, ${text.length} chars`,
    );
    return chunks.length;
  } catch (error) {
    logger.error(`[systemScan] Error processing ${filename}:`, error);
    return 0;
  }
}

/**
 * Scans all documents in DOCUMENTS array
 */
async function scanAll(): Promise<void> {
  logger.info("[systemScan] Starting document scan...");

  let totalChunks = 0;
  for (const doc of DOCUMENTS) {
    const count = await scanDocument(doc);
    totalChunks += count;
  }

  logger.info(
    `[systemScan] Scan complete: ${totalChunks} chunks across ${DOCUMENTS.length} documents`,
  );
}

/**
 * Main entry point
 */
async function main() {
  const isDaemon = process.argv.includes("--daemon");

  if (isDaemon) {
    logger.info(
      "[systemScan] Running in daemon mode with cron schedule: 0 2 * * * (2 AM daily)",
    );

    // Schedule nightly scan at 2 AM
    cron.schedule("0 2 * * *", async () => {
      logger.info("[systemScan] Cron triggered scan");
      await scanAll();
    });

    // Initial scan on startup
    await scanAll();

    // Keep process alive
    logger.info("[systemScan] Daemon started, waiting for scheduled tasks...");
  } else {
    // One-time scan
    await scanAll();
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error("[systemScan] Fatal error:", error);
    process.exit(1);
  });
}

export { scanAll, scanDocument };
