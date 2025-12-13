/**
 * @fileoverview NextAuth.js Authentication Handler
 * @description Core authentication endpoint handling all NextAuth.js routes including
 * sign-in, sign-out, session management, and OAuth callbacks.
 * @module api/auth/[...nextauth]
 *
 * @see {@link @/auth} for authentication configuration
 * @see https://next-auth.js.org/configuration/options for NextAuth documentation
 */

import { handlers } from "@/auth";
import { wrapRoute } from "@/lib/api/route-wrapper";

export const GET = wrapRoute(
  handlers.GET,
  "api.auth.nextauth.get.catch",
);
export const POST = wrapRoute(
  handlers.POST,
  "api.auth.nextauth.post.catch",
);

// Ensure credentials/Bcrypt stay on the Node runtime
export const runtime = 'nodejs';
