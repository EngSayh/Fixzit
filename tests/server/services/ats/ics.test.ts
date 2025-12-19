import { describe, it, expect } from "vitest";
import { generateInterviewICS, type InterviewInviteInput } from "@/server/services/ats/ics";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("ICS Service", () => {
  describe("generateInterviewICS", () => {
    const baseInput: InterviewInviteInput = {
      title: "Technical Interview - Software Engineer",
      organizer: { name: "HR Manager", email: "hr@company.com" },
      attendees: [
        { name: "John Doe", email: "john@example.com" },
        { email: "panel@company.com" },
      ],
      start: new Date("2025-01-15T10:00:00Z"),
      end: new Date("2025-01-15T11:00:00Z"),
    };

    it("should generate valid ICS content", () => {
      const ics = generateInterviewICS(baseInput);

      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("END:VCALENDAR");
      expect(ics).toContain("BEGIN:VEVENT");
      expect(ics).toContain("END:VEVENT");
    });

    it("should include event title", () => {
      const ics = generateInterviewICS(baseInput);

      expect(ics).toContain("SUMMARY:Technical Interview - Software Engineer");
    });

    it("should include organizer", () => {
      const ics = generateInterviewICS(baseInput);

      expect(ics).toContain("ORGANIZER");
      expect(ics).toContain("mailto:hr@company.com");
    });

    it("should include attendees", () => {
      const ics = generateInterviewICS(baseInput);
      // ICS may fold long lines, so unfold before checking
      const unfolded = ics.replace(/\r\n /g, "");

      expect(unfolded).toContain("ATTENDEE");
      expect(unfolded).toContain("mailto:john@example.com");
      expect(unfolded).toContain("mailto:panel@company.com");
    });

    it("should include description when provided", () => {
      const input = {
        ...baseInput,
        description: "Interview for senior developer position",
      };
      const ics = generateInterviewICS(input);

      expect(ics).toContain("Interview for senior developer position");
    });

    it("should include location when provided", () => {
      const input = {
        ...baseInput,
        location: "Conference Room A",
      };
      const ics = generateInterviewICS(input);

      expect(ics).toContain("LOCATION:Conference Room A");
    });

    it("should default location to Virtual", () => {
      const ics = generateInterviewICS(baseInput);

      expect(ics).toContain("LOCATION:Virtual");
    });

    it("should include start and end times", () => {
      const ics = generateInterviewICS(baseInput);

      expect(ics).toContain("DTSTART");
      expect(ics).toContain("DTEND");
    });

    it("should use custom UID when provided", () => {
      const input = {
        ...baseInput,
        uid: "custom-uid-12345",
      };
      const ics = generateInterviewICS(input);

      expect(ics).toContain("UID:custom-uid-12345");
    });

    it("should generate UID when not provided", () => {
      const ics = generateInterviewICS(baseInput);

      expect(ics).toMatch(/UID:\d+@/);
    });

    it("should set attendee participation status to NEEDS-ACTION", () => {
      const ics = generateInterviewICS(baseInput);

      expect(ics).toContain("PARTSTAT=NEEDS-ACTION");
    });

    it("should set attendee role to REQ-PARTICIPANT", () => {
      const ics = generateInterviewICS(baseInput);

      expect(ics).toContain("ROLE=REQ-PARTICIPANT");
    });

    it("should include PRODID", () => {
      const ics = generateInterviewICS(baseInput);

      expect(ics).toContain("PRODID:-//Fixzit ATS//Interview Scheduling//EN");
    });

    it("should include VERSION:2.0", () => {
      const ics = generateInterviewICS(baseInput);

      expect(ics).toContain("VERSION:2.0");
    });

    it("should handle multiple attendees", () => {
      const input = {
        ...baseInput,
        attendees: [
          { name: "Attendee 1", email: "a1@example.com" },
          { name: "Attendee 2", email: "a2@example.com" },
          { name: "Attendee 3", email: "a3@example.com" },
        ],
      };
      const ics = generateInterviewICS(input);
      // ICS may fold long lines, so unfold before checking
      const unfolded = ics.replace(/\r\n /g, "");

      expect(unfolded).toContain("mailto:a1@example.com");
      expect(unfolded).toContain("mailto:a2@example.com");
      expect(unfolded).toContain("mailto:a3@example.com");
    });

    it("should handle attendee without name", () => {
      const input = {
        ...baseInput,
        attendees: [{ email: "anonymous@example.com" }],
      };
      const ics = generateInterviewICS(input);
      // ICS may fold long lines, so unfold before checking
      const unfolded = ics.replace(/\r\n /g, "");

      expect(unfolded).toContain("mailto:anonymous@example.com");
    });
  });
});
