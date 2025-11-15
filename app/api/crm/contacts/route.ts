import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';

function isUnauthenticatedError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes('unauthenticated');
}

async function resolveSessionUser(req: NextRequest) {
  try {
    return await getSessionUser(req);
  } catch (error) {
    if (isUnauthenticatedError(error)) {
      return null;
    }
    throw error;
  }
}

export async function GET(req: NextRequest) {
  const user = await resolveSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ contacts: [], message: 'CRM contacts endpoint placeholder' });
}

export async function POST(req: NextRequest) {
  const user = await resolveSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await req.json().catch(() => ({}));
  return NextResponse.json(
    {
      contact: {
        id: 'pending-implementation',
        ...payload,
      },
      message: 'CRM contacts placeholder',
    },
    { status: 201 }
  );
}
