import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/mongo";
import { Project } from "@/src/server/models/Project";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(["NEW_CONSTRUCTION", "RENOVATION", "MAINTENANCE", "FIT_OUT", "DEMOLITION"]).optional(),
  status: z.enum(["PLANNING", "APPROVED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED", "CLOSED"]).optional(),
  timeline: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    duration: z.number().optional()
  }).optional(),
  budget: z.object({
    total: z.number().optional(),
    allocated: z.number().optional(),
    spent: z.number().optional(),
    remaining: z.number().optional()
  }).optional(),
  progress: z.object({
    overall: z.number().min(0).max(100).optional(),
    schedule: z.number().min(0).max(100).optional(),
    quality: z.number().min(0).max(100).optional(),
    cost: z.number().min(0).max(100).optional()
  }).optional(),
  tags: z.array(z.string()).optional()
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    await db;

    const project = await Project.findOne({
      _id: params.id,
      tenantId: user.tenantId
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    await db;

    const data = updateProjectSchema.parse(await req.json());

    const project = await Project.findOneAndUpdate(
      { _id: params.id, tenantId: user.tenantId },
      { 
        $set: { 
          ...data, 
          updatedBy: user.id,
          'progress.lastUpdated': new Date()
        } 
      },
      { new: true }
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    await db;

    const project = await Project.findOneAndUpdate(
      { _id: params.id, tenantId: user.tenantId },
      { $set: { status: "CANCELLED", updatedBy: user.id } },
      { new: true }
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}