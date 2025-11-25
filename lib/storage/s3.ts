import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.AWS_S3_BUCKET || "";
const KMS_KEY_ID = process.env.AWS_S3_KMS_KEY_ID || "";

type PresignedPut = {
  url: string;
  headers: Record<string, string>;
};

export function getS3Client() {
  if (!BUCKET) throw new Error("AWS_S3_BUCKET not configured");
  return new S3Client({ region: REGION });
}

export async function getPresignedGetUrl(
  key: string,
  expiresSeconds = 600,
): Promise<string> {
  const client = getS3Client();
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return await getSignedUrl(client, getCmd, { expiresIn: expiresSeconds });
}

function buildPutCommandInput(
  key: string,
  contentType: string,
  metadata?: Record<string, string>,
): PutObjectCommandInput {
  const base: PutObjectCommandInput = {
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    Metadata: metadata,
  };

  if (KMS_KEY_ID) {
    base.ServerSideEncryption = "aws:kms";
    base.SSEKMSKeyId = KMS_KEY_ID;
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

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "x-amz-server-side-encryption": KMS_KEY_ID ? "aws:kms" : "AES256",
    ...Object.entries(mergedMetadata).reduce(
      (acc, [k, v]) => {
        acc[`x-amz-meta-${k.toLowerCase()}`] = v;
        return acc;
      },
      {} as Record<string, string>,
    ),
  };

  if (KMS_KEY_ID) {
    headers["x-amz-server-side-encryption-aws-kms-key-id"] = KMS_KEY_ID;
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
  const client = getS3Client();
  const cmd = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await client.send(cmd);
}

export function buildResumeKey(
  tenantId: string | undefined | null,
  fileName: string,
) {
  const safeTenant = (tenantId || "global").replace(/[^a-zA-Z0-9_-]/g, "-");
  return `${safeTenant}/resumes/${fileName}`;
}
