// src/lib/storage.ts - Optional storage abstraction (S3 or Cloudinary) with safe fallback
import crypto from 'crypto';

function parseDataUrl(dataUrl: string): { mime: string; base64: string } {
  const idx = dataUrl.indexOf(',');
  const meta = dataUrl.slice(0, idx);
  const base64 = dataUrl.slice(idx + 1);
  const mime = meta.substring(5, meta.indexOf(';'));
  return { mime, base64 };
}

export async function uploadFromDataUrl(dataUrl: string, keyPrefix: string): Promise<{ url: string; mime: string; fileName: string }>{
  if (!dataUrl.startsWith('data:')) throw new Error('Invalid dataUrl');
  const { mime, base64 } = parseDataUrl(dataUrl);
  const ext = (mime.split('/')[1] || 'bin').toLowerCase();
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const key = `${keyPrefix}/${fileName}`;

  // Try S3 if configured
  if (process.env.S3_BUCKET && process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const s3 = new S3Client({ region: process.env.AWS_REGION });
      const buffer = Buffer.from(base64, 'base64');
      await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key, Body: buffer, ContentType: mime }));
      const url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      return { url, mime, fileName };
    } catch {}
  }

  // Try Cloudinary if configured
  if (process.env.CLOUDINARY_URL) {
    try {
      const cloudinary = (await import('cloudinary')).v2;
      cloudinary.config({ secure: true });
      const res = await cloudinary.uploader.upload(dataUrl, { folder: keyPrefix, use_filename: true, unique_filename: true });
      return { url: res.secure_url, mime, fileName: res.original_filename || fileName } as any;
    } catch {}
  }

  // Fallback: keep data URL (dev only)
  return { url: dataUrl, mime, fileName };
}


