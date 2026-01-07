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
      // SEC-001: Escape regex special characters to prevent ReDoS
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { email: { $regex: escapedSearch, $options: "i" } },
        { "personal.firstName": { $regex: escapedSearch, $options: "i" } },
        { "personal.lastName": { $regex: escapedSearch, $options: "i" } },
        { "personal.phone": { $regex: escapedSearch, $options: "i" } },
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

    // Execute queries in parallel - use aggregation with $lookup to avoid N+1
    const [usersWithOrgs, total] = await Promise.all([
      User.aggregate([
        { $match: filter },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "organizations",
            localField: "orgId",
            foreignField: "_id",
            as: "orgInfo",
            // Only fetch the name field
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        {
          $project: {
            _id: 1,
            email: 1,
            status: 1,
            role: 1,
            "professional.role": 1,
            "personal.firstName": 1,
            "personal.lastName": 1,
            "personal.phone": 1,
            orgId: 1,
            createdAt: 1,
            lastLogin: 1,
            isSuperAdmin: 1,
            // Extract org name from $lookup result
            orgName: { $arrayElemAt: ["$orgInfo.name", 0] },
          },
        },
      ]).exec() as Promise<Array<Record<string, unknown>>>,
      User.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      users: usersWithOrgs,
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
