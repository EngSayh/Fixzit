import { dbConnect } from '@/src/db/mongoose';
import ServiceContract from '@/src/models/ServiceContract';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();
  // body: { scope:'OWNER_GROUP'|'PROPERTY', scopeRef, contractorType:'FM_COMPANY'|'REAL_ESTATE_AGENT', contractorRef, startDate, endDate, terms, sla }
  const c = await ServiceContract.create(body);
  return NextResponse.json(c);
}
