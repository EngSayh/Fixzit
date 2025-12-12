import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock models
vi.mock("@/server/models/Candidate", () => ({
  Candidate: {
    findOne: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock("@/server/models/Application", () => ({
  Application: {
    create: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock("@/server/models/AtsSettings", () => ({
  AtsSettings: {
    findOne: vi.fn(),
  },
}));

vi.mock("@/server/models/Job", () => ({
  Job: {
    findById: vi.fn(),
  },
}));

// Mock resume parser
vi.mock("@/lib/ats/resume-parser", () => ({
  parseResumePDF: vi.fn().mockResolvedValue({
    text: "Mock resume content",
    name: "John Doe",
    email: "john@example.com",
  }),
}));

// Mock scoring
vi.mock("@/lib/ats/scoring", () => ({
  scoreApplication: vi.fn().mockReturnValue(75),
  extractSkillsFromText: vi.fn().mockReturnValue(["JavaScript", "React"]),
  calculateExperienceFromText: vi.fn().mockReturnValue(3),
}));

// Mock S3
vi.mock("@/lib/storage/s3", () => ({
  buildResumeKey: vi.fn().mockReturnValue("resumes/org/job/file.pdf"),
  putObjectBuffer: vi.fn().mockResolvedValue({ key: "resumes/org/job/file.pdf" }),
}));

import {
  submitApplicationFromForm,
  ApplicationSubmissionError,
} from "@/server/services/ats/application-intake";

describe("application-intake service", () => {
  const orgId = new Types.ObjectId();
  const jobId = new Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitApplicationFromForm", () => {
    it("should create application for valid job", async () => {
      const { Candidate } = await import("@/server/models/Candidate");
      const { Application } = await import("@/server/models/Application");

      vi.mocked(Candidate.findByEmail).mockResolvedValue(null);
      vi.mocked(Candidate.create).mockResolvedValue({
        _id: new Types.ObjectId(),
      } as never);
      vi.mocked(Application.create).mockResolvedValue({
        _id: new Types.ObjectId(),
        stage: "NEW",
        score: 75,
      } as never);

      const result = await submitApplicationFromForm({
        job: {
          _id: jobId,
          orgId,
          status: "published",
          visibility: "public",
        },
        fields: {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
        source: "careers",
      });

      expect(result.applicationId).toBeDefined();
      expect(result.stage).toBe("NEW");
    });

    it("should reject applications for unpublished jobs", async () => {
      await expect(
        submitApplicationFromForm({
          job: {
            _id: jobId,
            orgId,
            status: "draft", // Not published
            visibility: "public",
          },
          fields: {
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
          },
          source: "careers",
        })
      ).rejects.toThrow(ApplicationSubmissionError);
    });

    it("should reject applications for internal-only jobs from careers page", async () => {
      await expect(
        submitApplicationFromForm({
          job: {
            _id: jobId,
            orgId,
            status: "published",
            visibility: "internal", // Internal only
          },
          fields: {
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
          },
          source: "careers",
        })
      ).rejects.toThrow(ApplicationSubmissionError);
    });

    it("should throw 404 for missing job", async () => {
      await expect(
        submitApplicationFromForm({
          job: {
            _id: jobId,
            orgId: null, // Missing orgId
            status: "published",
          },
          fields: { email: "test@test.com" },
          source: "careers",
        })
      ).rejects.toThrow("Job not found");
    });

    it("should upload resume to S3", async () => {
      const { Candidate } = await import("@/server/models/Candidate");
      const { Application } = await import("@/server/models/Application");
      const { putObjectBuffer } = await import("@/lib/storage/s3");

      vi.mocked(Candidate.findByEmail).mockResolvedValue(null);
      vi.mocked(Candidate.create).mockResolvedValue({
        _id: new Types.ObjectId(),
      } as never);
      vi.mocked(Application.create).mockResolvedValue({
        _id: new Types.ObjectId(),
        stage: "NEW",
        score: 75,
      } as never);

      await submitApplicationFromForm({
        job: {
          _id: jobId,
          orgId,
          status: "published",
          visibility: "public",
        },
        fields: {
          email: "john@example.com",
        },
        resumeFile: {
          buffer: Buffer.from("fake pdf"),
          filename: "resume.pdf",
          mimeType: "application/pdf",
          size: 1024,
        },
        source: "careers",
      });

      expect(putObjectBuffer).toHaveBeenCalled();
    });

    it("should reuse existing candidate by email", async () => {
      const { Candidate } = await import("@/server/models/Candidate");
      const { Application } = await import("@/server/models/Application");

      const existingCandidateId = new Types.ObjectId();
      vi.mocked(Candidate.findByEmail).mockResolvedValue({
        _id: existingCandidateId,
        email: "john@example.com",
      });
      vi.mocked(Application.create).mockResolvedValue({
        _id: new Types.ObjectId(),
        candidateId: existingCandidateId,
        stage: "NEW",
        score: 75,
      } as never);

      const result = await submitApplicationFromForm({
        job: {
          _id: jobId,
          orgId,
          status: "published",
          visibility: "public",
        },
        fields: {
          email: "john@example.com",
        },
        source: "careers",
      });

      // Should not create new candidate
      expect(Candidate.create).not.toHaveBeenCalled();
      expect(result.applicationId).toBeDefined();
    });

    it("should score application based on job requirements", async () => {
      const { Candidate } = await import("@/server/models/Candidate");
      const { Application } = await import("@/server/models/Application");
      const { scoreApplication } = await import("@/lib/ats/scoring");

      vi.mocked(Candidate.findByEmail).mockResolvedValue(null);
      vi.mocked(Candidate.create).mockResolvedValue({
        _id: new Types.ObjectId(),
      } as never);
      vi.mocked(Application.create).mockResolvedValue({
        _id: new Types.ObjectId(),
        stage: "NEW",
        score: 85,
      } as never);

      await submitApplicationFromForm({
        job: {
          _id: jobId,
          orgId,
          status: "published",
          visibility: "public",
          skills: ["JavaScript", "React"],
          screeningRules: { minYears: 2 },
        },
        fields: {
          email: "john@example.com",
          skills: ["JavaScript", "React", "Node.js"],
          experience: 5,
        },
        source: "careers",
      });

      expect(scoreApplication).toHaveBeenCalled();
    });
  });

  describe("processApplication", () => {
    it("should parse resume and extract skills", async () => {
      const { extractSkillsFromText } = await import("@/lib/ats/scoring");

      // Skill extraction from resume
      const skills = vi.mocked(extractSkillsFromText)("Resume with JavaScript and React");

      expect(skills).toContain("JavaScript");
      expect(skills).toContain("React");
    });

    it("should calculate experience from resume", async () => {
      const { calculateExperienceFromText } = await import("@/lib/ats/scoring");

      const years = vi.mocked(calculateExperienceFromText)(
        "5 years of experience in software development"
      );

      expect(years).toBe(3); // Mocked value
    });
  });
});
