/**
 * Issue Comments API
 * 
 * POST: Add a comment to an issue
 * GET: List comments for an issue
 * 
 * @module app/api/issues/[id]/comments/route
 * @created [AGENT-0008]
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/getServerSession";
import { Issue } from "@/server/models/Issue";
import { connectMongo } from "@/lib/db/mongoose";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { Types } from "mongoose";

const CommentSchema = z.object({
  content: z.string().min(1, "Comment content is required").max(5000),
});

interface IssueComment {
  _id: Types.ObjectId;
  author: string;
  authorName?: string;
  content: string;
  createdAt: Date;
}

/**
 * GET /api/issues/[id]/comments
 * List all comments for an issue
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid issue ID" }, { status: 400 });
    }

    await connectMongo();
    
    const issue = await Issue.findById(id).select("comments orgId").lean();
    
    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    // Verify user has access to this issue's org
    const userOrgId = (session.user as { orgId?: string }).orgId;
    if (issue.orgId && userOrgId && issue.orgId.toString() !== userOrgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const comments = (issue.comments || []) as IssueComment[];
    
    return NextResponse.json({
      success: true,
      data: comments.map((c: IssueComment) => ({
        id: c._id?.toString(),
        author: c.author,
        authorName: c.authorName || "Unknown",
        content: c.content,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    logger.error("Failed to fetch issue comments", { error });
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/issues/[id]/comments
 * Add a comment to an issue
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid issue ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = CommentSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid comment", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    await connectMongo();
    
    const issue = await Issue.findById(id); // NO_LEAN - Need document for subdocument push
    
    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    // Verify user has access to this issue's org
    const userOrgId = (session.user as { orgId?: string }).orgId;
    if (issue.orgId && userOrgId && issue.orgId.toString() !== userOrgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const user = session.user as { id?: string; name?: string; email?: string };
    const userId = user.id || user.email || "unknown";
    const userName = user.name || user.email || "Unknown User";

    const newComment = {
      _id: new Types.ObjectId(),
      author: userId,
      authorName: userName,
      content: parsed.data.content,
      createdAt: new Date(),
    };

    // Add comment to issue
    if (!issue.comments) {
      issue.comments = [];
    }
    (issue.comments as IssueComment[]).push(newComment);
    issue.updatedAt = new Date();
    
    await issue.save();

    logger.info("Comment added to issue", {
      component: "issues-api",
      issueId: id,
      userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newComment._id.toString(),
        author: newComment.author,
        authorName: newComment.authorName,
        content: newComment.content,
        createdAt: newComment.createdAt,
      },
    });
  } catch (error) {
    logger.error("Failed to add issue comment", { error });
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}
