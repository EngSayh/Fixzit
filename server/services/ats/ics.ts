import ICAL from "ical.js";
import { EMAIL_DOMAINS } from "@/lib/config/domains";

export type InterviewInviteInput = {
  uid?: string;
  title: string;
  description?: string;
  location?: string;
  organizer: { name: string; email: string };
  attendees: Array<{ name?: string; email: string }>;
  start: Date;
  end: Date;
};

function toICSTime(date: Date) {
  return ICAL.Time.fromJSDate(date, true);
}

export function generateInterviewICS(input: InterviewInviteInput) {
  const vCalendar = new ICAL.Component(["vcalendar", [], []]);
  vCalendar.updatePropertyWithValue(
    "prodid",
    "-//Fixzit ATS//Interview Scheduling//EN",
  );
  vCalendar.updatePropertyWithValue("version", "2.0");

  const event = new ICAL.Component("vevent");
  const vevent = new ICAL.Event(event);
  vevent.uid = input.uid || `${Date.now()}@${EMAIL_DOMAINS.primary}`;
  vevent.summary = input.title;
  vevent.description = input.description || "";
  vevent.location = input.location || "Virtual";
  vevent.startDate = toICSTime(input.start);
  vevent.endDate = toICSTime(input.end);

  const organizerProp = new ICAL.Property("organizer");
  organizerProp.setParameter("cn", input.organizer.name);
  organizerProp.setValue(`mailto:${input.organizer.email}`);
  event.addProperty(organizerProp);

  input.attendees.forEach((attendee) => {
    const attendeeProp = new ICAL.Property("attendee");
    if (attendee.name) {
      attendeeProp.setParameter("cn", attendee.name);
    }
    attendeeProp.setValue(`mailto:${attendee.email}`);
    attendeeProp.setParameter("partstat", "NEEDS-ACTION");
    attendeeProp.setParameter("role", "REQ-PARTICIPANT");
    event.addProperty(attendeeProp);
  });

  vCalendar.addSubcomponent(event);
  return vCalendar.toString();
}
