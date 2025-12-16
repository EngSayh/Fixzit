import {
  TutorialLayout,
  type TutorialContent,
} from "../_components/TutorialLayout";

const content: TutorialContent = {
  title: "Tenant Relations & Communication",
  summary:
    "Standardize tenant communication, SLAs, and feedback loops to keep satisfaction high.",
  category: "Customer Service",
  difficulty: "Beginner",
  duration: "12 min",
  outcomes: [
    "Log and route tenant requests with clear priorities",
    "Keep tenants updated automatically during the work order lifecycle",
    "Capture feedback to improve response quality",
  ],
  steps: [
    {
      title: "Capture tenant requests",
      highlight: "Use clear categories so routing and reporting stay clean.",
      items: [
        "Enable tenant portal or intake form; map request types to work order categories.",
        "Collect unit/property, contact info, and preferred access times.",
        "Set default SLAs for common issues (AC, elevators, plumbing).",
      ],
    },
    {
      title: "Communicate status proactively",
      items: [
        "Turn on notifications for submission, assignment, arrival window, and completion.",
        "Share technician ETA and any access requirements.",
        "Provide a single thread for updates, photos, and approvals.",
      ],
    },
    {
      title: "Handle access and appointments",
      items: [
        "Capture access notes (keys, security, escorts) on the work order.",
        "Offer time windows and confirm before dispatch when needed.",
        "Record delays with reasons to improve future scheduling.",
      ],
    },
    {
      title: "Close and request feedback",
      items: [
        "Share before/after photos and resolution notes on completion.",
        "Send a quick rating request (1–5) with optional comments.",
        "Escalate low scores automatically to a manager follow-up queue.",
      ],
    },
  ],
  nextActions: [
    "Pre-fill SLA targets for top tenant issue categories.",
    "Enable tenant notifications in Settings → Communications.",
    "Add a feedback webhook/email to route low scores to CS managers.",
  ],
};

export const metadata = {
  title: `${content.title} | Fixzit Help`,
};

export default function Page() {
  return <TutorialLayout content={content} />;
}
