/**
 * Lightweight AV scan client for S3 objects.
 * Expects an external scanning service at AV_SCAN_ENDPOINT that accepts:
 *   POST { bucket: string, key: string }
 * and returns { clean: boolean }.
 */
export async function scanS3Object(key: string, bucket = process.env.AWS_S3_BUCKET || ''): Promise<boolean> {
  const endpoint = process.env.AV_SCAN_ENDPOINT;
  if (!endpoint) {
    // No scanner configured; treat as clean.
    return true;
  }
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, key }),
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return Boolean(data?.clean ?? data?.success ?? false);
  } catch {
    return false;
  }
}
