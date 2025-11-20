import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET = process.env.AWS_S3_BUCKET || '';

export function getS3Client() {
  if (!BUCKET) throw new Error('AWS_S3_BUCKET not configured');
  return new S3Client({ region: REGION });
}

export async function getPresignedGetUrl(key: string, expiresSeconds = 600): Promise<string> {
  const client = getS3Client();
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return await getSignedUrl(client, getCmd, { expiresIn: expiresSeconds });
}

export async function getPresignedPutUrl(key: string, contentType: string, expiresSeconds = 600): Promise<string> {
  const client = getS3Client();
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return await getSignedUrl(client, cmd, { expiresIn: expiresSeconds });
}

export async function putObjectBuffer(key: string, buffer: Buffer, contentType: string) {
  const client = getS3Client();
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType });
  await client.send(cmd);
}

export function buildResumeKey(tenantId: string | undefined | null, fileName: string) {
  const safeTenant = (tenantId || 'global').replace(/[^a-zA-Z0-9_-]/g, '-');
  return `${safeTenant}/resumes/${fileName}`;
}
