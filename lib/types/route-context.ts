/**
 * Generic RouteContext type for Next.js 15 dynamic route params
 *
 * Next.js 15+ provides params as a Promise or direct object.
 * Use this type with specific param shapes:
 *
 * @example
 * RouteContext<{ id: string }>
 * RouteContext<{ id: string; action: string }>
 */
export type RouteContext<
  T extends Record<string, string> = Record<string, string>,
> = {
  params: Promise<T> | T;
};
