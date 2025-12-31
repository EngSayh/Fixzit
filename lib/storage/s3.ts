import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import { gzipSync, gunzipSync } from "node:zlib";
import { 
  getS3Client as getClient,
  assertS3Configured,
  getS3Config,
} from "./s3-config";

type PresignedPut = {
  url: string;
  headers: Record<string, string>;
};

/**
 * Get S3 client - throws if not configured
 * @deprecated Use getS3Client from s3-config instead
 */
export function getS3Client() {
  const client = getClient();
  if (!client) {
    throw new Error("AWS_S3_BUCKET not configured");
  }
  return client;
}

export async function getPresignedGetUrl(
  key: string,
  expiresSeconds = 600,
): Promise<string> {
  const config = assertS3Configured(); // Throws if not configured
  const client = getS3Client();
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const getCmd = new GetObjectCommand({ Bucket: config.bucket, Key: key });
  return await getSignedUrl(client, getCmd, { expiresIn: expiresSeconds });
}

function buildPutCommandInput(
  key: string,
  contentType: string,
  metadata?: Record<string, string>,
): PutObjectCommandInput {
  const config = assertS3Configured();
  
  const base: PutObjectCommandInput = {
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
    Metadata: metadata,
  };

  if (config.kmsKeyId) {
    base.ServerSideEncryption = "aws:kms";
    base.SSEKMSKeyId = config.kmsKeyId;
  } else {
    base.ServerSideEncryption = "AES256";
  }

  return base;
}

export async function getPresignedPutUrl(
  key: string,
  contentType: string,
  expiresSeconds = 600,
  metadata?: Record<string, string>,
): Promise<PresignedPut> {
  const client = getS3Client();
  const mergedMetadata = {
    "av-status": "pending",
    ...(metadata ?? {}),
  };
  const cmd = new PutObjectCommand(
    buildPutCommandInput(key, contentType, mergedMetadata),
  );
  const url = await getSignedUrl(client, cmd, { expiresIn: expiresSeconds });

  const config = getS3Config()!; // Already validated by assertS3Configured
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "x-amz-server-side-encryption": config.kmsKeyId ? "aws:kms" : "AES256",
    ...Object.entries(mergedMetadata).reduce(
      (acc, [k, v]) => {
        acc[`x-amz-meta-${k.toLowerCase()}`] = v;
        return acc;
      },
      {} as Record<string, string>,
    ),
  };

  if (config.kmsKeyId) {
    headers["x-amz-server-side-encryption-aws-kms-key-id"] = config.kmsKeyId;
  }

  return { url, headers };
}

export async function putObjectBuffer(
  key: string,
  buffer: Buffer,
  contentType: string,
) {
  const client = getS3Client();
  const cmd = new PutObjectCommand({
    ...buildPutCommandInput(key, contentType),
    Body: buffer,
  });
  await client.send(cmd);
}

export async function deleteObject(key: string) {
  const config = assertS3Configured();
  const client = getS3Client();
  const cmd = new DeleteObjectCommand({ Bucket: config.bucket, Key: key });
  await client.send(cmd);
  await client.send(cmd);
}

export function buildResumeKey(
  tenantId: string | undefined | null,
  fileName: string,
) {
  const safeTenant = (tenantId || "global").replace(/[^a-zA-Z0-9_-]/g, "-");
  return `${safeTenant}/resumes/${fileName}`;
}

// ============================================================================
// Building Model Storage (with gzip compression)
// ============================================================================

export type PutJsonOptions = {
  key: string;
  json: unknown;
  gzip?: boolean;
  cacheControl?: string;
  contentType?: string;
};

/**
 * Put JSON to S3 with optional gzip compression
 * Used for large building models (>800KB)
 */
export async function putJsonToS3(
  opts: PutJsonOptions
): Promise<{ bucket: string; key: string; bytes: number }> {
  const config = assertS3Configured();
  const client = getS3Client();

  const contentType = opts.contentType ?? "application/json";
  const cacheControl = opts.cacheControl ?? "private, max-age=0, no-cache";

  const raw = Buffer.from(JSON.stringify(opts.json), "utf8");
  const body = opts.gzip ? gzipSync(raw) : raw;

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: opts.key,
      Body: body,
      ContentType: contentType,
      ContentEncoding: opts.gzip ? "gzip" : undefined,
      CacheControl: cacheControl,
    })
  );

  return { bucket: config.bucket, key: opts.key, bytes: body.byteLength };
}

/**
 * Helper to convert S3 stream body to buffer
 */
async function streamToBuffer(body: unknown): Promise<Buffer> {
  const stream = body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}

/**
 * Get object text from S3 (with automatic gzip decompression)
 * @param params - Object key and optional bucket
 * @returns Decoded text content
 */
export async function getObjectText(params: {
  bucket?: string;
  key: string;
}): Promise<string> {
  const config = assertS3Configured();
  const client = getS3Client();
  const bucket = params.bucket ?? config.bucket;

  const res = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: params.key })
  );
  
  if (!res.Body) throw new Error("S3 object body is empty");

  const buf = await streamToBuffer(res.Body);
  const isGzip =
    (res.ContentEncoding ?? "").toLowerCase() === "gzip" ||
    params.key.endsWith(".gz");
  const out = isGzip ? gunzipSync(buf) : buf;

  return out.toString("utf8");
}

/**
 * Build S3 key for building model storage
 */
export function buildBuildingModelS3Key(
  orgId: string,
  propertyId: string,
  version: number
): string {
  return `org/${orgId}/properties/${propertyId}/building-models/v${version}.json.gz`;
}
