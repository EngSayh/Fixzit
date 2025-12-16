/**
 * Email Verification Token Utilities
 * 
 * Generates and validates HMAC-signed tokens for email verification.
 * Tokens are stateless (no database storage) with 24-hour expiry.
 * 
 * @module lib/auth/emailVerification
 * 
 * Security:
 * - HMAC-SHA256 signature prevents tampering
 * - 24-hour expiry window
 * - Base64url encoding for URL safety
 */
import crypto from "crypto";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export function signVerificationToken(
  email: string,
  secret: string,
  now: number = Date.now(),
): string {
  const exp = now + TOKEN_TTL_MS;
  const payload = `${email}|${exp}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifyVerificationToken(
  token: string,
  secret: string,
  now: number = Date.now(),
): { ok: true; email: string } | { ok: false; reason: string } {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [email, expStr, sig] = decoded.split("|");
    if (!email || !expStr || !sig) return { ok: false, reason: "invalid" };
    const payload = `${email}|${expStr}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    const sigBuf = Buffer.from(sig, "hex");
    if (expectedBuf.length !== sigBuf.length) {
      return { ok: false, reason: "signature" };
    }
    if (!crypto.timingSafeEqual(expectedBuf, sigBuf)) {
      return { ok: false, reason: "signature" };
    }
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || now > exp) {
      return { ok: false, reason: "expired" };
    }
    return { ok: true, email };
  } catch (_error) {
    return { ok: false, reason: "invalid" };
  }
}

export function verificationLink(origin: string, token: string): string {
  return `${origin}/api/auth/verify?token=${token}`;
}
