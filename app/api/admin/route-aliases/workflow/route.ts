import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  readAliasWorkflow,
  upsertAliasWorkflow,
  AliasWorkflowMap,
} from "@/lib/routes/workflowStore";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const map = readAliasWorkflow();
  return NextResponse.json(map satisfies AliasWorkflowMap);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { aliasFile, owner, resolved } = body as {
      aliasFile?: string;
      owner?: string;
      resolved?: boolean;
    };

    if (!aliasFile) {
      return NextResponse.json(
        { error: "aliasFile is required" },
        { status: 400 },
      );
    }

    const entry = upsertAliasWorkflow(aliasFile, {
      owner: owner ?? "",
      resolved: resolved ?? false,
    });

    return NextResponse.json(entry);
  } catch (_error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
