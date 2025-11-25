import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAbility } from "@/server/middleware/withAuthRbac";
import { FMErrors, fmErrorContext, type FMErrorOptions } from "../errors";

type Ability = Parameters<typeof requireAbility>[0];

const ABILITY_ERROR_MAP: Record<
  number,
  (message?: string, options?: FMErrorOptions) => NextResponse
> = {
  401: FMErrors.unauthorized,
  403: FMErrors.forbidden,
};

export function requireFmAbility(ability: Ability) {
  return async (req: NextRequest) => {
    const result = await requireAbility(ability)(req);
    if (result instanceof NextResponse) {
      const formatter =
        ABILITY_ERROR_MAP[result.status] ?? FMErrors.internalError;
      const context = fmErrorContext(req);
      return formatter(undefined, context);
    }
    return result;
  };
}
