/**
 * ICS Calendar Generator - Create RFC-5545 compliant .ics files for interview scheduling
 * Phase 2 implementation
 */

import { EMAIL_DOMAINS } from "@/lib/config/domains";

interface ICSEvent {
  summary: string; // Event title
  description?: string; // Event details
  location?: string; // Event location
  startTime: Date; // Event start
  endTime: Date; // Event end
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: Array<{
    name: string;
    email: string;
  }>;
  url?: string; // Meeting URL (for virtual interviews)
}

/**
 * Generate RFC-5545 compliant ICS file content
 */
export function generateICS(event: ICSEvent): string {
  const now = formatICSDate(new Date());
  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${process.env.EMAIL_DOMAIN || "fixzit.co"}`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fixzit//ATS Interview Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatICSDate(event.startTime)}`,
    `DTEND:${formatICSDate(event.endTime)}`,
    `SUMMARY:${escapeICSString(event.summary)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSString(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICSString(event.location)}`);
  }

  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  if (event.organizer) {
    lines.push(
      `ORGANIZER;CN="${escapeICSString(event.organizer.name)}":MAILTO:${event.organizer.email}`,
    );
  }

  if (event.attendees && event.attendees.length > 0) {
    event.attendees.forEach((attendee) => {
      lines.push(
        `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;` +
          `CN="${escapeICSString(attendee.name)}";RSVP=TRUE:MAILTO:${attendee.email}`,
      );
    });
  }

  lines.push("STATUS:CONFIRMED", "SEQUENCE:0", "END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Format Date object to ICS format (YYYYMMDDTHHmmssZ)
 */
function formatICSDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape special characters in ICS strings
 */
function escapeICSString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

/**
 * Generate ICS for ATS interview
 */
export function generateInterviewICS(interview: {
  jobTitle: string;
  candidateName: string;
  candidateEmail?: string;
  scheduledAt: Date;
  duration: number; // minutes
  location?: string;
  meetingUrl?: string;
  interviewers?: Array<{ name: string; email: string }>;
  notes?: string;
}): string {
  const startTime = new Date(interview.scheduledAt);
  const endTime = new Date(
    startTime.getTime() + interview.duration * 60 * 1000,
  );

  const summary = `Interview: ${interview.candidateName} - ${interview.jobTitle}`;

  let description = `Interview with ${interview.candidateName} for the position of ${interview.jobTitle}.`;
  if (interview.notes) {
    description += `\n\nNotes:\n${interview.notes}`;
  }
  if (interview.meetingUrl) {
    description += `\n\nJoin Meeting: ${interview.meetingUrl}`;
  }

  const attendees: Array<{ name: string; email: string }> = [];

  // Add candidate as attendee
  if (interview.candidateEmail) {
    attendees.push({
      name: interview.candidateName,
      email: interview.candidateEmail,
    });
  }

  // Add interviewers as attendees
  if (interview.interviewers) {
    attendees.push(...interview.interviewers);
  }

  return generateICS({
    summary,
    description,
    location:
      interview.location || (interview.meetingUrl ? "Virtual Meeting" : "TBD"),
    startTime,
    endTime,
    attendees,
    url: interview.meetingUrl,
  });
}

/**
 * Create downloadable blob URL for ICS file
 */
export function createICSDownloadURL(icsContent: string): string {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  return URL.createObjectURL(blob);
}

/**
 * Trigger download of ICS file in browser
 */
export function downloadICS(icsContent: string, filename: string): void {
  const url = createICSDownloadURL(icsContent);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export type { ICSEvent };
