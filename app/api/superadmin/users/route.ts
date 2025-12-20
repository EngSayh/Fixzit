/**
 * @fileoverview Superadmin Users API
 * @description CRUD endpoints for managing all users across tenants
 * @route GET/POST /api/superadmin/users
 * @access Superadmin only
 * @module api/superadmin/users
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { User } from "@/server/models/User";
import { Organization } from "@/server/models/Organization";
import { z } from "zod";
import mongoose from "mongoose";

// Pagination defaults
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Query schema for listing
const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING", "all"]).optional(),
  role: z.string().optional(),
  orgId: z.string().optional(),
  sortBy: z.enum(["email", "createdAt", "status", "role"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * GET /api/superadmin/users
 * List all users with pagination, search, and filters
 */
export async function GET(request: NextRequest) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    await connectDb();

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const parsed = listQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { page, limit, search, status, role, orgId, sortBy, sortOrder } = parsed.data;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter: Record<string, unknown> = {};
    
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: "i" } },
        { "personal.firstName": { $regex: search, $options: "i" } },
        { "personal.lastName": { $regex: search, $options: "i" } },
        { "personal.phone": { $regex: search, $options: "i" } },
      ];
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (role && role !== "all") {
      filter.$or = [
        { role: role },
        { "professional.role": role },
      ];
    }

    if (orgId && mongoose.isValidObjectId(orgId)) {
      filter.orgId = new mongoose.Types.ObjectId(orgId);
    }

    // Build sort
    const sortField = sortBy === "role" ? "professional.role" : sortBy;
    const sort: Record<string, 1 | -1> = {
      [sortField]: sortOrder === "asc" ? 1 : -1,
    };

    // Execute queries in parallel
    const [users, total, orgsMap] = await Promise.all([
      User.find(filter)
        .select("email status role professional.role personal.firstName personal.lastName personal.phone orgId createdAt lastLogin isSuperAdmin")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec() as Promise<Array<Record<string, unknown>>>,
      User.countDocuments(filter).exec(),
      // Get unique org IDs and fetch org names
      (async () => {
        const allUsers = await User.find(filter).select("orgId").lean().exec() as Array<{ orgId?: mongoose.Types.ObjectId }>;
        const orgIds = [...new Set(allUsers.map(u => u.orgId?.toString()).filter(Boolean))];
        if (orgIds.length === 0) return new Map<string, string>();
        const orgs = await Organization.find({ _id: { $in: orgIds } }).select("name").lean().exec() as Array<{ _id: mongoose.Types.ObjectId; name: string }>;
        return new Map(orgs.map((o: { _id: mongoose.Types.ObjectId; name: string }) => [o._id.toString(), o.name]));
      })(),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Enhance users with org names
    const enhancedUsers = users.map(user => ({
      ...user,
      orgName: user.orgId ? orgsMap.get(String(user.orgId)) : null,
    }));

    return NextResponse.json({
      users: enhancedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    logger.error("[Superadmin Users] Failed to list users", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
