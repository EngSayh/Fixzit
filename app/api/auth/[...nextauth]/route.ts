import { handlers } from "@/auth";

export const GET = handlers.GET;
export const POST = handlers.POST;

// Ensure credentials/Bcrypt stay on the Node runtime
export const runtime = 'nodejs';
