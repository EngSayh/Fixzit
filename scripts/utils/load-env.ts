import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  loaded = true;

  const cwd = process.cwd();
  const nodeEnv = process.env.NODE_ENV?.trim();
  const candidates = [
    ".env.local",
    nodeEnv ? `.env.${nodeEnv}.local` : null,
    nodeEnv ? `.env.${nodeEnv}` : null,
    ".env",
  ].filter(Boolean) as string[];

  for (const file of candidates) {
    const fullPath = path.join(cwd, file);
    if (fs.existsSync(fullPath)) {
      config({ path: fullPath, override: false });
    }
  }
}
