import fs from "node:fs";
import path from "node:path";

import { startMemoryLeakMonitor, type MemoryLeakSignal } from "@/lib/monitoring/memory-leak-detector";

type ArgMap = Record<string, string | boolean>;

function parseArgs(): ArgMap {
  const args = process.argv.slice(2);
  return args.reduce<ArgMap>((acc, arg) => {
    const [key, value] = arg.split("=");
    if (!key) return acc;
    const normalizedKey = key.replace(/^--/, "");
    acc[normalizedKey] = value ?? true;
    return acc;
  }, {});
}

function getNumber(value: string | boolean | undefined, fallback: number): number {
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

async function main() {
  const args = parseArgs();
  const durationMs = getNumber(args.duration, 10 * 60 * 1000); // 10 minutes default
  const intervalMs = getNumber(args.interval, 30_000);
  const growthThresholdMb = getNumber(args.threshold, 128);
  const sustainedGrowthIntervals = getNumber(args.sustained, 3);
  const label = typeof args.label === "string" ? args.label : "next-server";
  const enableHeapSnapshot = args.snapshots === true || args.snapshots === "true";
  const snapshotDir =
    typeof args.snapshotDir === "string"
      ? args.snapshotDir
      : path.resolve(process.cwd(), "_artifacts", "memory-leaks");

  const reportPath =
    typeof args.reportPath === "string"
      ? path.resolve(process.cwd(), args.reportPath)
      : path.resolve(process.cwd(), "_artifacts", "memory-leak-report.json");

  const events: MemoryLeakSignal[] = [];
  const monitor = startMemoryLeakMonitor({
    label,
    intervalMs,
    growthThresholdMb,
    sustainedGrowthIntervals,
    snapshotDir,
    enableHeapSnapshot,
    onLeak: (signal) => {
      events.push(signal);
    },
  });

  await new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

  monitor.stop();

  const samples = monitor.samples();
  const summary = {
    label,
    durationMs,
    intervalMs,
    growthThresholdMb,
    sustainedGrowthIntervals,
    sampleCount: samples.length,
    latestSample: samples[samples.length - 1],
    events,
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), "utf8");

  // eslint-disable-next-line no-console
  console.log(
    `[MemoryLeak] Monitor finished for ${label}. Samples: ${samples.length}, events: ${events.length}. Report: ${reportPath}`,
  );
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("[MemoryLeak] monitor failed:", error);
  process.exitCode = 1;
});
