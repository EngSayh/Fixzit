import crypto from "crypto";

const TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour (shorter than verification for security)

/**
 * Generate a signed password reset token.
 * Token contains: email|expiry|random|signature
 * The random component prevents token reuse across multiple reset requests.
 */
export function signPasswordResetToken(
  email: string,
  secret: string,
  now: number = Date.now(),
): string {
  const exp = now + TOKEN_TTL_MS;
  // Add random component to ensure each token is unique
  const random = crypto.randomBytes(8).toString("hex");
  const payload = `${email}|${exp}|${random}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

/**
 * Verify a password reset token.
 * Returns the email if valid, or an error reason if not.
 */
export function verifyPasswordResetToken(
  token: string,
  secret: string,
  now: number = Date.now(),
): { ok: true; email: string } | { ok: false; reason: string } {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 4) return { ok: false, reason: "invalid" };
    
    const [email, expStr, random, sig] = parts;
    if (!email || !expStr || !random || !sig) return { ok: false, reason: "invalid" };
    
    const payload = `${email}|${expStr}|${random}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    
    // Timing-safe comparison to prevent timing attacks
    if (expected.length !== sig.length) return { ok: false, reason: "signature" };
    const expectedBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(sig);
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

/**
 * Build the password reset link.
 */
export function passwordResetLink(origin: string, token: string): string {
  return `${origin}/forgot-password/reset?token=${token}`;
}
