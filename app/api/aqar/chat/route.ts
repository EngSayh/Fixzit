/**
 * @fileoverview Aqar Chat Route Alias
 * @description Re-exports the Aqar support chatbot endpoint for the /api/aqar/chat path.
 * This provides a more intuitive URL for AI-powered real estate assistant conversations.
 * @module api/aqar/chat
 * @see {@link ../support/chatbot/route} for the actual implementation
 */

import { wrapRoute } from "@/lib/api/route-wrapper";
import { POST as chatbotPost } from "../support/chatbot/route";

export const POST = wrapRoute(chatbotPost, "api.aqar.chat.post.catch");

// Explicit runtime declaration for Next.js edge/nodejs selection
export const runtime = "nodejs";
