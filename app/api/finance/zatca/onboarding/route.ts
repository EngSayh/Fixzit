import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongo";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { requestComplianceCsid, requestProductionCsid, submitComplianceInvoice } from "@/lib/zatca/fatoora-client";
import type { ZatcaComplianceResponse, ZatcaProductionCsidResponse } from "@/lib/zatca/fatoora-types";
import type { Document, WithId } from "mongodb";
import { COLLECTIONS } from "@/lib/db/collection-names";

interface ZatcaCredentialsDoc extends Document { orgId: string; complianceCsid?: string; productionCsid?: string; secret?: string; complianceRequestId?: string; status: string; createdAt: Date; updatedAt: Date; }

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser(req);
  if (!user?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const body = await req.json() as { action: string; csr?: string; otp?: string; invoice?: string; invoiceHash?: string };
  const { action, csr, otp, invoice, invoiceHash } = body;
  const db = await connectDb();
  const collection = db.collection(COLLECTIONS.ZATCA_CREDENTIALS);
  
  if (action === "request-compliance") {
    if (!csr || !otp) return NextResponse.json({ error: "CSR and OTP required" }, { status: 400 });
    const result: ZatcaComplianceResponse = await requestComplianceCsid(csr, otp);
    if (!result.success) return NextResponse.json({ error: "Compliance request failed", details: result.errors }, { status: 400 });
    await collection.updateOne({ orgId: user.orgId }, { $set: { complianceCsid: result.csid, secret: result.secret, complianceRequestId: result.requestId, status: "compliance", updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
    return NextResponse.json({ success: true, csid: result.csid, expiresAt: result.expiresAt });
  }
  
  if (action === "submit-compliance") {
    if (!invoice || !invoiceHash) return NextResponse.json({ error: "Invoice data required" }, { status: 400 });
    // eslint-disable-next-line local/require-lean -- NO_LEAN: Native MongoDB driver, not Mongoose
    const creds = await collection.findOne({ orgId: user.orgId }) as WithId<ZatcaCredentialsDoc> | null;
    if (!creds?.complianceCsid || !creds?.secret) return NextResponse.json({ error: "No compliance credentials" }, { status: 400 });
    const result = await submitComplianceInvoice(creds.complianceCsid, creds.secret, invoice, invoiceHash);
    return NextResponse.json(result);
  }
  
  if (action === "request-production") {
    // eslint-disable-next-line local/require-lean -- NO_LEAN: Native MongoDB driver, not Mongoose
    const creds = await collection.findOne({ orgId: user.orgId }) as WithId<ZatcaCredentialsDoc> | null;
    if (!creds?.complianceCsid || !creds?.secret || !creds?.complianceRequestId) return NextResponse.json({ error: "Complete compliance first" }, { status: 400 });
    const result: ZatcaProductionCsidResponse = await requestProductionCsid(creds.complianceCsid, creds.secret, creds.complianceRequestId);
    if (!result.success) return NextResponse.json({ error: "Production request failed", details: result.errors }, { status: 400 });
    await collection.updateOne({ orgId: user.orgId }, { $set: { productionCsid: result.csid, secret: result.secret, status: "production", updatedAt: new Date() } });
    return NextResponse.json({ success: true, csid: result.csid, expiresAt: result.expiresAt });
  }
  
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser(req);
  if (!user?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await connectDb();
  const creds = await db.collection(COLLECTIONS.ZATCA_CREDENTIALS).findOne({ orgId: user.orgId }) as WithId<ZatcaCredentialsDoc> | null;
  if (!creds) return NextResponse.json({ status: "not_started", hasCompliance: false, hasProduction: false });
  return NextResponse.json({ status: creds.status, hasCompliance: !!creds.complianceCsid, hasProduction: !!creds.productionCsid, updatedAt: creds.updatedAt });
}
