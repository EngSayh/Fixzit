/**
 * Theme API Endpoint
 * 
 * GET: Retrieve current theme configuration
 * PUT: Update theme colors (SuperAdmin only)
 * 
 * @module app/api/superadmin/theme/route
 * @compliance Ejar.sa Design System (Saudi Platforms Code)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/getServerSession";
import { PlatformSettings } from "@/server/models/PlatformSettings";
import { connectMongo } from "@/lib/db/mongoose";
import { BRAND_COLORS, NEUTRAL_SCALE } from "@/lib/config/brand-colors";

/**
 * Default theme configuration based on Ejar.sa design system
 */
const DEFAULT_THEME = {
  // Primary Colors (Ejar Green)
  primary: BRAND_COLORS.primary,
  primaryHover: BRAND_COLORS.primaryHover,
  primaryActive: BRAND_COLORS.primaryDark,
  primaryLight: BRAND_COLORS.primaryLight,
  
  // Secondary Colors (Gold accent)
  secondary: BRAND_COLORS.secondary,
  secondaryHover: BRAND_COLORS.secondaryHover,
  
  // Semantic Colors
  success: BRAND_COLORS.success,
  successLight: "#ECFDF5",
  warning: BRAND_COLORS.warning,
  warningLight: "#FFFAEB",
  error: BRAND_COLORS.error,
  errorLight: "#FEF3F2",
  info: BRAND_COLORS.info,
  infoLight: "#EFF8FF",
  
  // Neutral Scale
  neutral50: NEUTRAL_SCALE[50],
  neutral100: NEUTRAL_SCALE[100],
  neutral200: NEUTRAL_SCALE[200],
  neutral300: NEUTRAL_SCALE[300],
  neutral400: NEUTRAL_SCALE[400],
  neutral500: NEUTRAL_SCALE[500],
  neutral600: NEUTRAL_SCALE[600],
  neutral700: NEUTRAL_SCALE[700],
  neutral800: NEUTRAL_SCALE[800],
  neutral900: NEUTRAL_SCALE[900],
  neutral950: NEUTRAL_SCALE[950],
  
  // Special Colors
  sidebarBg: NEUTRAL_SCALE[950],
  footerBg: NEUTRAL_SCALE[950],
  headerBg: BRAND_COLORS.primary,
  
  // Additional brand colors
  lavender: BRAND_COLORS.lavender,
  saudiGreen: BRAND_COLORS.saudiGreen,
};

/**
 * GET /api/superadmin/theme
 * Retrieve current theme configuration (public endpoint for theme loading)
 */
export async function GET() {
  try {
    await connectMongo();
    
    // PLATFORM_WIDE: Platform settings are global (not tenant-scoped)
    const settings = await PlatformSettings.findOne({}).lean();
    
    if (!settings?.theme) {
      // Return default theme if not configured
      return NextResponse.json({
        success: true,
        theme: DEFAULT_THEME,
        isDefault: true,
      });
    }
    
    // Merge with defaults to ensure all keys exist
    const theme = { ...DEFAULT_THEME, ...settings.theme };
    
    return NextResponse.json({
      success: true,
      theme,
      isDefault: false,
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- Error boundary logging
    console.error("[Theme API] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch theme" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/superadmin/theme
 * Update theme configuration (SuperAdmin only)
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify SuperAdmin session
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Check for SuperAdmin role
    const isSuperAdmin = 
      session.user.role === "superadmin" || 
      session.user.role === "super_admin" ||
      session.user.isSuperAdmin === true;
    
    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden - SuperAdmin access required" },
        { status: 403 }
      );
    }
    
    await connectMongo();
    
    const body = await request.json();
    const { theme } = body;
    
    if (!theme || typeof theme !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid theme data" },
        { status: 400 }
      );
    }
    
    // Validate hex colors
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    for (const [key, value] of Object.entries(theme)) {
      if (typeof value === "string" && !hexColorRegex.test(value)) {
        return NextResponse.json(
          { success: false, error: `Invalid color format for ${key}: ${value}` },
          { status: 400 }
        );
      }
    }
    
    // PLATFORM_WIDE: Platform settings are global (SuperAdmin only)
    const updatedSettings = await PlatformSettings.findOneAndUpdate(
      {},
      { 
        $set: { 
          theme: { ...DEFAULT_THEME, ...theme },
          brandColor: theme.primary || DEFAULT_THEME.primary,
        }
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    
    return NextResponse.json({
      success: true,
      theme: updatedSettings.theme,
      message: "Theme updated successfully",
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- Error boundary logging
    console.error("[Theme API] PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update theme" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superadmin/theme/reset
 * Reset theme to Ejar.sa defaults (SuperAdmin only)
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const isSuperAdmin = 
      session.user.role === "superadmin" || 
      session.user.role === "super_admin" ||
      session.user.isSuperAdmin === true;
    
    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden - SuperAdmin access required" },
        { status: 403 }
      );
    }
    
    await connectMongo();
    
    // PLATFORM_WIDE: Platform settings are global (SuperAdmin only)
    await PlatformSettings.findOneAndUpdate(
      {},
      { 
        $set: { 
          theme: DEFAULT_THEME,
          brandColor: DEFAULT_THEME.primary,
        }
      },
      { upsert: true, new: true }
    );
    
    return NextResponse.json({
      success: true,
      theme: DEFAULT_THEME,
      message: "Theme reset to Ejar.sa defaults",
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- Error boundary logging
    console.error("[Theme API] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset theme" },
      { status: 500 }
    );
  }
}
