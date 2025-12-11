/**
 * @fileoverview Aqar Chat Route Alias
 * @description Re-exports the Aqar support chatbot endpoint for the /api/aqar/chat path.
 * This provides a more intuitive URL for AI-powered real estate assistant conversations.
 * @module api/aqar/chat
 * @see {@link ../support/chatbot/route} for the actual implementation
 */

export { POST } from "../support/chatbot/route";

// Explicit runtime declaration avoids Next.js warning about re-exported runtime
export const runtime = "nodejs";
