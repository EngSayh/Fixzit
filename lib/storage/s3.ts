import {
  PutObjectCommand,
  DeleteObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
