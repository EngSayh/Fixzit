/**
 * Superadmin Logout API
 * Clears superadmin session
 * 
 * @module app/api/superadmin/logout/route
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Clear the superadmin token
    cookieStore.delete("superadmin_token");

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error("[SUPERADMIN] Logout error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Allow GET for simple logout links
  return POST();
}
