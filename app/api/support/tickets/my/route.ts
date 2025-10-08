import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SupportTicket } from "@/server/models/SupportTicket";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest){
  await connectToDatabase();
  const user = await getSessionUser(req);
  const items = await (SupportTicket as any).find({ createdByUserId: user.id }).sort({ createdAt:-1 }).limit(200);
  return NextResponse.json({ items });
}

