import { describe, it, expect } from "vitest";
import { buildAttendanceCsv } from "@/lib/hr/attendance-export";

describe("buildAttendanceCsv", () => {
  it("renders header and rows with ISO dates", () => {
    const csv = buildAttendanceCsv(
      [
        {
          date: "2025-05-15T00:00:00.000Z",
          status: "PRESENT",
          clockIn: "2025-05-15T06:00:00.000Z",
          clockOut: "2025-05-15T14:00:00.000Z",
          overtimeMinutes: 30,
          source: "MANUAL",
          notes: "On-site",
        },
      ],
      { employeeCode: "EMP-1", dateFrom: "2025-05-01", dateTo: "2025-05-31" },
    );

    const lines = csv.split("\n");
    expect(lines[0]).toContain("EMP-1");
    expect(lines[1]).toContain("Date");
    expect(lines[2]).toContain('"PRESENT"');
    expect(lines[2]).toContain('"2025-05-15T06:00:00.000Z"');
  });

  it("escapes commas and quotes in notes", () => {
    const csv = buildAttendanceCsv(
      [
        {
          date: new Date("2025-06-01"),
          status: "ABSENT",
          notes: 'Doctor said "rest", urgent',
        },
      ],
      { employeeCode: "EMP-2", dateFrom: "2025-06-01", dateTo: "2025-06-01" },
    );

    expect(csv).toContain('"Doctor said ""rest"", urgent"');
  });
});
