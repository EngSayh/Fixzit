import { dbConnect } from '@/src/db/mongoose';
import Benchmark from '@/src/models/Benchmark';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/src/server/middleware/withAuthRbac';

/**
 * Retrieve all Benchmark documents, restricted to authorized admin users.
 *
 * Connects to the database, validates the session user from `req`, and returns
 * all Benchmark records when the user has one of the roles: `CORPORATE_ADMIN`,
 * `SUPER_ADMIN`, or `ADMIN`.
 *
 * @param req - Incoming NextRequest used to resolve the session user.
 * @returns A NextResponse with:
 *  - status 200 and a JSON array of Benchmark documents on success,
 *  - status 403 and `{ error: "Forbidden" }` if the user's role is not allowed,
 *  - status 401 and `{ error: "Unauthorized" }` when authentication fails.
 */
export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const user = await getSessionUser(req as any);
    const allowed = ['CORPORATE_ADMIN', 'SUPER_ADMIN', 'ADMIN'];
    if (!allowed.includes(user.role as any)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(await Benchmark.find({}));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
/**
 * Create a new Benchmark document.
 *
 * Accepts a JSON body describing the Benchmark and requires an authenticated user
 * with one of the roles: `CORPORATE_ADMIN`, `SUPER_ADMIN`, or `ADMIN`.
 * On success returns the created Benchmark as JSON.
 * Returns 403 if the user is not authorized, 401 for authentication-related failures
 * (e.g., unauthenticated or invalid/expired token), or 500 for other creation errors.
 *
 * @param req - NextRequest whose JSON body contains the Benchmark fields to create.
 * @returns A NextResponse with the created Benchmark document on success or an error object.
 */
export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const user = await getSessionUser(req as any);
    const allowed = ['CORPORATE_ADMIN', 'SUPER_ADMIN', 'ADMIN'];
    if (!allowed.includes(user.role as any)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    const doc = await Benchmark.create(body);
    return NextResponse.json(doc);
  } catch (e) {
    const msg = (e as any)?.message || 'Unauthorized';
    if (msg === 'Unauthenticated' || msg === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('admin/benchmarks POST error:', e);
    return NextResponse.json({ error: 'Failed to create benchmark' }, { status: 500 });
  }
}
