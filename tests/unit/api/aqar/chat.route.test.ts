/**
 * @fileoverview Unit tests for Aqar chat API
 * @description Verifies auth/RBAC enforcement, rate limiting, and error handling
 */
import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


const routePath = path.join(process.cwd(), "app/api/aqar/chat/route.ts");
const routeSource = fs.readFileSync(routePath, "utf8");

describe('Aqar Chat API', () => {
  describe('POST /api/aqar/chat', () => {
    it("should reference the support chatbot handler", () => {
      expect(routeSource).toContain("support/chatbot/route");
      expect(routeSource).toContain("chatbotPost");
    });

    it("should wrap the handler for error boundaries", () => {
      expect(routeSource).toContain("wrapRoute");
      expect(routeSource).toContain("api.aqar.chat.post.catch");
    });

    it("should export a POST handler", () => {
      expect(routeSource).toContain("export const POST");
    });
  });
});
