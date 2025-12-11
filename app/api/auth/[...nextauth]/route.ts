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

export const GET = handlers.GET;
export const POST = handlers.POST;

// Ensure credentials/Bcrypt stay on the Node runtime
export const runtime = 'nodejs';
