import fs from "node:fs";
import path from "node:path";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { setInterval as setNodeInterval, clearInterval as clearNodeInterval } from "node:timers";
import { writeHeapSnapshot } from "node:v8";

import { logger } from "@/lib/logger";

const MB = 1024 * 1024;

export interface MemorySample {
  timestamp: number;
  heapUsedBytes: number;
  rssBytes: number;
  externalBytes: number;
  eventLoopDelayMs?: number;
}

export interface MemoryLeakSignal {
  label?: string;
  deltaMb: number;
  baselineMb: number;
  heapUsedMb: number;
  rssMb: number;
  sampleCount: number;
  timestamp: string;
  snapshotPath?: string;
}

export interface MemoryLeakMonitorOptions {
  label?: string;
  intervalMs?: number;
  windowSize?: number;
  growthThresholdMb?: number;
  sustainedGrowthIntervals?: number;
  snapshotDir?: string;
  enableHeapSnapshot?: boolean;
  onLeak?: (signal: MemoryLeakSignal) => void;
}

export interface MemoryLeakMonitor {
  stop: () => void;
  samples: () => MemorySample[];
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function toMb(value: number) {
  return Number((value / MB).toFixed(2));
}

export function startMemoryLeakMonitor(options: MemoryLeakMonitorOptions = {}): MemoryLeakMonitor {
  const {
    label = "next-server",
    intervalMs = 30_000,
    windowSize = 10,
    growthThresholdMb = 128,
    sustainedGrowthIntervals = 3,
    snapshotDir = path.resolve(process.cwd(), "_artifacts", "memory-leaks"),
    enableHeapSnapshot = false,
    onLeak,
  } = options;

  const samples: MemorySample[] = [];
  const histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();

  let consecutiveGrowthHits = 0;

  const sampleMemory = (): MemorySample => {
    const usage = process.memoryUsage();
    const eventLoopDelayMs = histogram.percentile(99) / 1e6;

    return {
      timestamp: Date.now(),
      heapUsedBytes: usage.heapUsed,
      rssBytes: usage.rss,
      externalBytes: usage.external,
      eventLoopDelayMs: Number.isFinite(eventLoopDelayMs) ? Number(eventLoopDelayMs.toFixed(2)) : undefined,
    };
  };

  const recordSample = () => {
    const sample = sampleMemory();
    samples.push(sample);
    if (samples.length > windowSize * 4) {
      samples.shift();
    }

    const minHeapUsed = Math.min(...samples.map((entry) => entry.heapUsedBytes));
    const currentDeltaMb = toMb(sample.heapUsedBytes - minHeapUsed);

    if (currentDeltaMb >= growthThresholdMb) {
      consecutiveGrowthHits += 1;
    } else {
      consecutiveGrowthHits = 0;
    }

    if (consecutiveGrowthHits >= sustainedGrowthIntervals) {
      const signal: MemoryLeakSignal = {
        label,
        deltaMb: currentDeltaMb,
        baselineMb: toMb(minHeapUsed),
        heapUsedMb: toMb(sample.heapUsedBytes),
        rssMb: toMb(sample.rssBytes),
        sampleCount: samples.length,
        timestamp: new Date(sample.timestamp).toISOString(),
      };

      if (enableHeapSnapshot) {
        ensureDir(snapshotDir);
        const snapshotPath = path.join(snapshotDir, `heap-${label}-${Date.now()}.heapsnapshot`);
        try {
          writeHeapSnapshot(snapshotPath);
          signal.snapshotPath = snapshotPath;
        } catch (error) {
          logger.error("[MemoryLeak] Failed to write heap snapshot", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.warn(`[MemoryLeak] Potential leak detected for "${label}"`, {
        ...signal,
      });

      if (onLeak) {
        onLeak(signal);
      }

      consecutiveGrowthHits = 0;
    }
  };

  const timer = setNodeInterval(recordSample, intervalMs);
  timer.unref();

  logger.info("[MemoryLeak] Monitor started", {
    label,
    intervalMs,
    windowSize,
    growthThresholdMb,
    sustainedGrowthIntervals,
    enableHeapSnapshot,
    snapshotDir: enableHeapSnapshot ? snapshotDir : undefined,
  });

  return {
    stop: () => {
      clearNodeInterval(timer);
      histogram.disable();
    },
    samples: () => [...samples],
  };
}
