import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";
// Stub: return a fake PUT URL that your frontend will use; replace with S3/GCS logic.
export async function POST(req:NextRequest, {params}:{params:{id:string}}){
  const _ = await getSessionUser(req);
  const body = await req.json();
  const fileName = encodeURIComponent(body?.name || "upload.bin");
  const putUrl = `http://localhost:3000/api/dev-null-upload?name=${fileName}`; // replace with real presign
  return NextResponse.json({ putUrl, key:`wo/${params.id}/${fileName}` });
}

