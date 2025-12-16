/**
 * Antivirus Scan Client for S3 Objects
 * 
 * Lightweight client for external AV scanning service.
 * Validates uploaded files for malware before processing.
 * 
 * @module lib/security/av-scan
 * 
 * Configuration:
 * - AV_SCAN_ENDPOINT: External scanner service URL
 * - AWS_S3_BUCKET: S3 bucket containing files to scan
 * 
 * Protocol:
 * - POST to scanner with { bucket, key }
 * - Expects response { clean: boolean }
 * - Defaults to clean if scanner not configured
 */
export async function scanS3Object(
  key: string,
  bucket = process.env.AWS_S3_BUCKET || "",
): Promise<boolean> {
  const endpoint = process.env.AV_SCAN_ENDPOINT;
  if (!endpoint) {
    // No scanner configured; treat as clean.
    return true;
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, key }),
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return Boolean(data?.clean ?? data?.success ?? false);
  } catch {
    return false;
  }
}
