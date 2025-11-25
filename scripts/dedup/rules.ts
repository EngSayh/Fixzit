/**
 * Maps duplicate file patterns to their canonical source paths.
 *
 * Example:
 * {
 *   'src/models/User.ts': '@/server/models/User.ts',
 *   'db/models/User.ts': '@/server/models/User.ts'
 * }
 */
export const GOLDEN: Record<string, string> = {};
