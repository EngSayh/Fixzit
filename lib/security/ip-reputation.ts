import { LRUCache } from "lru-cache";
import { isPrivateIP } from "@/server/security/ip-utils";

type ReputationLevel = "trusted" | "neutral" | "suspicious" | "block";

export type ReputationSignalType =
  | "rate_limit_exceeded"
  | "auth_failure"
  | "malformed_payload"
  | "blocked_path"
  | "suspicious_ua"
  | "manual_block"
  | "trusted_service";

export interface ReputationSignal {
  ip: string;
  type: ReputationSignalType;
  path?: string;
  weight?: number;
}

export interface IpReputationResult {
  ip: string;
  score: number;
  level: ReputationLevel;
  reasons: string[];
  throttleMultiplier: number;
  shouldBlock: boolean;
  evaluatedAt: string;
}

type CachedReputation = {
  scoreDelta: number;
  reasons: Set<string>;
};

const BASE_SCORE = 60;
const MAX_DELTA = 40;
const MIN_DELTA = -60;
const cacheTtlMs = 60 * 60 * 1000; // 60 minutes

const reputationCache = new LRUCache<string, CachedReputation>({
  max: 5000,
  ttl: cacheTtlMs,
  updateAgeOnGet: true,
});

const signalWeights: Record<ReputationSignalType, number> = {
  rate_limit_exceeded: -12,
  auth_failure: -8,
  malformed_payload: -6,
  blocked_path: -10,
  suspicious_ua: -6,
  manual_block: -50,
  trusted_service: 25,
};

const blocklist = parseListEnv(
  process.env.IP_REPUTATION_BLOCKLIST || process.env.IP_DENYLIST || "",
);
const allowlist = parseListEnv(
  process.env.IP_REPUTATION_ALLOWLIST || process.env.IP_ALLOWLIST || "",
);

function parseListEnv(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function ipToInt(ip: string): number | null {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null;
  return (
    (parts[0] << 24) +
    (parts[1] << 16) +
    (parts[2] << 8) +
    parts[3]
  );
}

function matchesCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split("/");
  if (!range) return false;
  const target = ipToInt(ip);
  const base = ipToInt(range);
  if (target === null || base === null) return false;

  const maskBits = Number(bits ?? "32");
  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
  return (target & mask) === (base & mask);
}

function isListMatch(ip: string, list: string[]): boolean {
  if (!ip || !list.length) return false;
  return list.some((entry) => {
    if (entry.includes("/")) return matchesCidr(ip, entry);
    return entry === ip;
  });
}

function normalizeIp(ip: string | null | undefined): string {
  return (ip ?? "").trim() || "unknown";
}

function deriveLevel(score: number, blocked: boolean): ReputationLevel {
  if (blocked || score < 30) return "block";
  if (score >= 80) return "trusted";
  if (score >= 55) return "neutral";
  return "suspicious";
}

function deriveMultiplier(level: ReputationLevel): number {
  switch (level) {
    case "trusted":
      return 1.1;
    case "neutral":
      return 1;
    case "suspicious":
      return 0.6;
    case "block":
      return 0.35;
    default:
      return 1;
  }
}

function getCached(ip: string): CachedReputation | undefined {
  const cached = reputationCache.get(ip);
  if (!cached) return undefined;
  return {
    scoreDelta: cached.scoreDelta,
    reasons: new Set(cached.reasons),
  };
}

function updateCache(ip: string, delta: number, reason: string): void {
  if (!ip) return;
  const cached = getCached(ip) ?? { scoreDelta: 0, reasons: new Set() };
  const nextDelta = clamp(cached.scoreDelta + delta, MIN_DELTA, MAX_DELTA);
  cached.scoreDelta = nextDelta;
  cached.reasons.add(reason);
  reputationCache.set(ip, cached);
}

export function recordReputationSignal(signal: ReputationSignal): void {
  const ip = normalizeIp(signal.ip);
  if (ip === "unknown") return;

  const weight =
    signal.weight ?? signalWeights[signal.type] ?? signalWeights.auth_failure;
  const reason =
    signal.type === "blocked_path" && signal.path
      ? `blocked:${signal.path}`
      : signal.type;

  updateCache(ip, weight, reason);
}

export function evaluateIpReputation(input: {
  ip?: string | null;
  path?: string | null;
  userAgent?: string | null;
}): IpReputationResult {
  const ip = normalizeIp(input.ip);
  const reasons = new Set<string>();
  let score = BASE_SCORE;

  if (ip === "unknown") {
    score -= 25;
    reasons.add("unknown-ip");
  } else if (isPrivateIP(ip)) {
    score -= 10;
    reasons.add("private-range");
  }

  if (isListMatch(ip, blocklist)) {
    score = 0;
    reasons.add("blocklist");
  }

  if (isListMatch(ip, allowlist)) {
    score = Math.max(score, 95);
    reasons.add("allowlist");
  }

  const cached = getCached(ip);
  if (cached) {
    score += cached.scoreDelta;
    cached.reasons.forEach((item) => reasons.add(item));
  }

  const userAgent = (input.userAgent ?? "").trim();
  if (!userAgent) {
    score -= 4;
    reasons.add("missing-user-agent");
  } else if (/curl|python-requests|wget|scrapy|bot|crawler/i.test(userAgent)) {
    score -= 8;
    reasons.add("bot-user-agent");
  }

  if (input.path && /\/\.env|\/wp-admin|\/wp-login\.php/i.test(input.path)) {
    score -= 8;
    reasons.add("suspicious-path");
  }

  score = clamp(score, 0, 100);
  const blocked = reasons.has("blocklist") || score < 20;
  const level = deriveLevel(score, blocked);
  const throttleMultiplier = deriveMultiplier(level);

  return {
    ip,
    score,
    level,
    throttleMultiplier,
    shouldBlock: blocked,
    reasons: Array.from(reasons),
    evaluatedAt: new Date().toISOString(),
  };
}

export function applyReputationToLimit(
  baseLimit: number,
  opts: { ip?: string | null; path?: string | null; userAgent?: string | null },
): { limit: number; reputation?: IpReputationResult } {
  const reputation = opts.ip
    ? evaluateIpReputation({
        ip: opts.ip,
        path: opts.path,
        userAgent: opts.userAgent,
      })
    : undefined;

  if (!reputation) {
    return { limit: baseLimit };
  }

  if (reputation.shouldBlock) {
    return { limit: 0, reputation };
  }

  const adjusted = Math.max(
    3,
    Math.round(baseLimit * reputation.throttleMultiplier),
  );

  return { limit: adjusted, reputation };
}
