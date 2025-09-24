import { NextRequest, NextResponse } from 'next/server';
import { checkModuleAccess } from '@/src/middleware/featureGate';

export async function POST(req: NextRequest) {
  try {
    const { customerId, requiredModules } = await req.json();

    if (!customerId || !requiredModules || !Array.isArray(requiredModules)) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    const { hasAccess, missingModules } = await checkModuleAccess(
      customerId,
      requiredModules
    );

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: 'Module not enabled on your subscription',
          missingModules,
          requiredModules
        },
        { status: 402 }
      );
    }

    return NextResponse.json({ hasAccess: true });
  } catch (error) {
    console.error('Check access error:', error);
    return NextResponse.json(
      { error: 'Failed to check module access' },
      { status: 500 }
    );
  }
}