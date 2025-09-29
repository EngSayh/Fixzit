import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/src/lib/mongo";
import { SupportTicket } from "@/src/server/models/SupportTicket";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest){
  await connectDb();
  const user = await getSessionUser(req);
  const items = await (SupportTicket as any).find({ createdByUserId: user.id }).sort({ createdAt:-1 }).limit(200);
  return NextResponse.json({ items });
}
