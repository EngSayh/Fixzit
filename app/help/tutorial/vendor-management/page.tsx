import {
  TutorialLayout,
  type TutorialContent,
} from "../_components/TutorialLayout";

const content: TutorialContent = {
  title: "Vendor Management Best Practices",
  summary:
    "Onboard vendors, publish RFQs, and approve work with clear SLAs and compliance checks.",
  category: "Procurement",
  difficulty: "Intermediate",
  duration: "20 min",
  outcomes: [
    "Create and categorize vendors with compliance and rates captured",
    "Publish RFQs and compare responses consistently",
    "Approve jobs and track vendor performance over time",
  ],
  steps: [
    {
      title: "Onboard and categorize vendors",
      highlight: "Get documents upfront to reduce delays when issuing RFQs.",
      items: [
        "Go to Vendors → Add Vendor; capture trade, regions, and specialties.",
        "Upload compliance docs (licenses, insurance, HSE) and set expiry reminders.",
        "Store rate cards (hourly, call-out, materials) for auto-selection in RFQs.",
      ],
    },
    {
      title: "Set SLA and approval guardrails",
      items: [
        "Define response and completion SLAs by category (e.g., HVAC, MEP).",
        "Assign approvers for spend thresholds (e.g., >SAR 5k requires manager).",
        "Enable notifications for expiring documents and underperforming vendors.",
      ],
    },
    {
      title: "Publish an RFQ",
      items: [
        "Navigate to RFQs → New RFQ; describe scope and attach plans/photos.",
        "Select invited vendors or open to approved category vendors.",
        "Set submission deadline and evaluation criteria (price, SLA, past performance).",
      ],
    },
    {
      title: "Evaluate and award",
      items: [
        "Compare responses side-by-side with normalized price breakdowns.",
        "Document award rationale and notify winners automatically.",
        "Generate a PO or service order for the winning vendor.",
      ],
    },
    {
      title: "Track delivery and performance",
      items: [
        "Link vendor work to work orders and capture completion evidence.",
        "Score vendors on timeliness, quality, and communication.",
        "Review scores quarterly to adjust preferred vendor lists.",
      ],
    },
  ],
  nextActions: [
    "Upload existing vendor documents and set expiry alerts.",
    "Create RFQ templates for common scopes (cleaning, landscaping, HVAC).",
    "Turn on vendor scorecards to inform future awards.",
  ],
};

export const metadata = {
  title: `${content.title} | Fixzit Help`,
};

export default function Page() {
  return <TutorialLayout content={content} />;
}
