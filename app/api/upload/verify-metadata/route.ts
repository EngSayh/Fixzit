import { NextRequest, NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";
import { getS3Client } from "@/lib/storage/s3";
import { Config } from "@/lib/config/constants";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req).catch(() => null);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
  if (!rl.allowed) return rateLimitError();

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  try {
    const client = getS3Client();
    const cmd = new HeadObjectCommand({
      Bucket: Config.aws.s3.bucket,
      Key: key,
    });
    const res = await client.send(cmd);

    return NextResponse.json(
      {
        key,
        contentType: res.ContentType,
        contentLength: res.ContentLength,
        metadata: res.Metadata,
      },
      { status: 200 },
    );
  } catch (_err) {
    return NextResponse.json(
      { error: "Failed to verify object metadata" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req).catch(() => null);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
  if (!rl.allowed) return rateLimitError();

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const key = typeof body.key === "string" ? body.key : "";
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  try {
    const client = getS3Client();
    const cmd = new HeadObjectCommand({
      Bucket: Config.aws.s3.bucket,
      Key: key,
    });
    const res = await client.send(cmd);

    return NextResponse.json(
      {
        key,
        contentType: res.ContentType,
        contentLength: res.ContentLength,
        metadata: res.Metadata,
      },
      { status: 200 },
    );
  } catch (_err) {
    return NextResponse.json(
      { error: "Failed to verify object metadata" },
      { status: 500 },
    );
  }
}
