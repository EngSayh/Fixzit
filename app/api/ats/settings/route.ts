import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { AtsSettings } from '@/server/models/AtsSettings';
import { logger } from '@/lib/logger';
import { atsRBAC } from '@/lib/ats/rbac';
import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { buildRateLimitKey } from '@/server/security/rateLimitKey';

/**
 * GET /api/ats/settings - Get ATS settings for organization
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // RBAC: Check permissions for reading settings
    const authResult = await atsRBAC(req, ['settings:read']);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const rl = rateLimit(buildRateLimitKey(req, authResult.userId), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const { orgId } = authResult;
    let settings = await AtsSettings.findOne({ orgId })
      .select('scoringWeights knockoutRules alerts createdAt updatedAt')
      .lean();
    
    if (!settings) {
      // Create default settings if not found
      const newSettings = await AtsSettings.findOrCreateForOrg(orgId);
      settings = newSettings.toObject ? newSettings.toObject() : newSettings;
    }

    if (!settings) {
      return NextResponse.json(
        { error: 'Failed to create or retrieve settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        scoringWeights: settings.scoringWeights,
        knockoutRules: settings.knockoutRules,
        alerts: settings.alerts || [],
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error: unknown) {
    logger.error('Error fetching ATS settings', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ats/settings - Update ATS settings
 */
export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();

    // RBAC: Check permissions for updating settings
    const authResult = await atsRBAC(req, ['settings:update']);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const rl = rateLimit(buildRateLimitKey(req, authResult.userId), 30, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const { orgId } = authResult;
    const body = await req.json();
    const { scoringWeights, knockoutRules, alerts } = body;

    // Validation
    if (scoringWeights) {
      const { skills, experience, culture, education } = scoringWeights;
      const total = (skills || 0) + (experience || 0) + (culture || 0) + (education || 0);
      
      if (Math.abs(total - 1) > 0.01) {
        return NextResponse.json(
          { error: 'Validation failed', message: 'Scoring weights must sum to 1.0 (100%)' },
          { status: 400 }
        );
      }

      if (skills < 0 || skills > 1 || experience < 0 || experience > 1 || culture < 0 || culture > 1 || education < 0 || education > 1) {
        return NextResponse.json(
          { error: 'Validation failed', message: 'Each weight must be between 0 and 1' },
          { status: 400 }
        );
      }
    }

    if (knockoutRules?.minYears !== undefined && knockoutRules.minYears < 0) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Minimum years cannot be negative' },
        { status: 400 }
      );
    }

    const settings = await AtsSettings.findOrCreateForOrg(orgId);

    // Update fields
    if (scoringWeights) {
      const currentWeights = settings.scoringWeights || { skills: 0.6, experience: 0.3, culture: 0.05, education: 0.05 };
      settings.scoringWeights = {
        skills: scoringWeights.skills ?? currentWeights.skills,
        experience: scoringWeights.experience ?? currentWeights.experience,
        culture: scoringWeights.culture ?? currentWeights.culture,
        education: scoringWeights.education ?? currentWeights.education
      };
    }

    if (knockoutRules) {
      const currentRules = settings.knockoutRules || { minYears: 0, requiredSkills: [], autoRejectMissingExperience: false, autoRejectMissingSkills: true };
      settings.knockoutRules = {
        minYears: knockoutRules.minYears ?? currentRules.minYears,
        requiredSkills: knockoutRules.requiredSkills ?? currentRules.requiredSkills,
        autoRejectMissingExperience: knockoutRules.autoRejectMissingExperience ?? currentRules.autoRejectMissingExperience,
        autoRejectMissingSkills: knockoutRules.autoRejectMissingSkills ?? currentRules.autoRejectMissingSkills
      };
    }

    if (alerts) {
      settings.alerts = alerts;
    }

    await settings.save();

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        scoringWeights: settings.scoringWeights,
        knockoutRules: settings.knockoutRules,
        alerts: settings.alerts,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error: unknown) {
    logger.error('Error updating ATS settings', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', message },
      { status: 500 }
    );
  }
}
