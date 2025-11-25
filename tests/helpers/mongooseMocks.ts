import { vi } from "vitest";

/**
 * Utilities to build common Mongoose query chains for tests without repetitive inline mocks.
 */
export function makeFindSortLimitSelectLean<T>(result: T) {
  const lean = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ lean });
  const limit = vi.fn().mockReturnValue({ select });
  const sort = vi.fn().mockReturnValue({ limit });
  return {
    chain: { sort },
    mocks: { sort, limit, select, lean },
  };
}

export function makeFindOneSelectLean<T>(result: T) {
  const lean = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ lean });
  return {
    chain: { select },
    mocks: { select, lean },
  };
}
