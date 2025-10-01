import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const data = {
    message: "PowerShell heredoc works!",
    timestamp: new Date().toISOString()
  };
  return NextResponse.json(data);
}
