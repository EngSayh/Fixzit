import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb-unified";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { submitForClearance, submitForReporting, encodeInvoiceXml } from "@/lib/zatca/fatoora-client";
import { generateInvoiceHash } from "@/lib/zatca/crypto";
import type { ZatcaSubmissionResult } from "@/lib/zatca/fatoora-types";
import type { Document, WithId, FindCursor, Sort } from "mongodb";
import { COLLECTIONS } from "@/lib/db/collection-names";

interface ZatcaCredentialsDoc extends Document { orgId: string; productionCsid?: string; secret?: string; }
interface ZatcaSubmissionDoc extends Document { orgId: string; invoiceId: string; invoiceHash: string; type: "clearance" | "reporting"; status: string; response?: ZatcaSubmissionResult; createdAt: Date; }

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser(req);
  if (!user?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { type: "clearance" | "reporting"; invoiceXml: string; invoiceId: string };
  const { type, invoiceXml, invoiceId } = body;
  if (!invoiceXml || typeof invoiceXml !== "string" || !invoiceXml.trim()) return NextResponse.json({ error: "Missing or empty invoiceXml" }, { status: 400 });
  if (!invoiceId || typeof invoiceId !== "string" || !invoiceId.trim()) return NextResponse.json({ error: "Missing or empty invoiceId" }, { status: 400 });
  if (type !== "clearance" && type !== "reporting") return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const db = await getDatabase();
  const creds = await db.collection(COLLECTIONS.ZATCA_CREDENTIALS).findOne({ orgId: user.orgId }) as WithId<ZatcaCredentialsDoc> | null;
  if (!creds?.productionCsid || !creds?.secret) return NextResponse.json({ error: "Complete ZATCA onboarding first" }, { status: 400 });

  const invoiceHash = generateInvoiceHash(invoiceXml);
  const encodedInvoice = encodeInvoiceXml(invoiceXml);

  let result: ZatcaSubmissionResult;
  if (type === "clearance") {
    result = await submitForClearance(creds.productionCsid, creds.secret, encodedInvoice, invoiceHash);
  } else {
    result = await submitForReporting(creds.productionCsid, creds.secret, encodedInvoice, invoiceHash);
  }

  await db.collection(COLLECTIONS.ZATCA_SUBMISSIONS).insertOne({ orgId: user.orgId, invoiceId, invoiceHash, type, status: result.success ? "success" : "failed", response: result, createdAt: new Date() });
  return NextResponse.json(result);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser(req);
  if (!user?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);
  const skip = parseInt(url.searchParams.get("skip") || "0", 10);

  const db = await getDatabase();
  const collection = db.collection(COLLECTIONS.ZATCA_SUBMISSIONS);
  const cursor = collection.find({ orgId: user.orgId }) as FindCursor<WithId<ZatcaSubmissionDoc>>;
  const submissions = await cursor.sort({ createdAt: -1 } as Sort).skip(skip).limit(limit).toArray();
  const total = await collection.countDocuments({ orgId: user.orgId });

  return NextResponse.json({ submissions, total, limit, skip });
}
