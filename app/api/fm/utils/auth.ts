import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAbility } from '@/server/middleware/withAuthRbac';
import { FMErrors } from '../errors';

type Ability = Parameters<typeof requireAbility>[0];

const ABILITY_ERROR_MAP: Record<number, () => NextResponse> = {
  401: FMErrors.unauthorized,
  403: FMErrors.forbidden,
};

export function requireFmAbility(ability: Ability) {
  return async (req: NextRequest) => {
    const result = await requireAbility(ability)(req);
    if (result instanceof NextResponse) {
      const formatter = ABILITY_ERROR_MAP[result.status] ?? FMErrors.internalError;
      return formatter();
    }
    return result;
  };
}
