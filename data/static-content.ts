export type StaticHelpArticle = {
  slug: string;
  title: string;
  category: string;
  status: "PUBLISHED";
  content: string;
  updatedAt: string;
};

export type StaticCmsPage = {
  slug: string;
  title: string;
  status: "PUBLISHED";
  content: string;
  updatedAt: string;
};

export type StaticJob = {
  id: string;
  slug: string;
  title: string;
  department: string;
  status: "published";
  visibility: "public";
  descriptionHtml: string;
  requirements: string[];
  benefits: string[];
  location: {
    city: string;
    country: string;
    mode: "onsite" | "remote" | "hybrid";
  };
};

const STATIC_HELP_ARTICLES: StaticHelpArticle[] = [
  {
    slug: "fm-mobile-operations",
    title: "Manage Work Orders From Any Device",
    category: "Work Orders",
    status: "PUBLISHED",
    updatedAt: "2024-10-01T09:00:00.000Z",
    content: [
      "## Run a mobile-first FM team",
      "",
      "1. Download the Fixzit Superapp on iOS/Android.",
      "2. Sign in with your tenant or technician account.",
      "3. Enable notifications for urgent work orders.",
      "",
      "Use the *Assignments* tab to accept or reassign jobs, capture photos, and attach completion notes directly from the field.",
    ].join("\n"),
  },
  {
    slug: "souq-seller-care",
    title: "Resolve Souq Seller Issues In Minutes",
    category: "Marketplace",
    status: "PUBLISHED",
    updatedAt: "2024-09-12T08:30:00.000Z",
    content: [
      "## Seller Happiness Playbook",
      "",
      "- Monitor the **Account Health** widget for every seller.",
      "- Trigger an account review when SLA breaches exceed 3 per week.",
      "- Use the templated responses inside Support > Seller Care.",
      "",
      "Tip: Document every dispute in the CRM timeline so finance, compliance, and support remain aligned.",
    ].join("\n"),
  },
  {
    slug: "finance-close-checklist",
    title: "Monthly Finance Close Checklist",
    category: "Finance",
    status: "PUBLISHED",
    updatedAt: "2024-08-05T10:15:00.000Z",
    content: [
      "## Finance close with confidence",
      "",
      "1. Run the **Open Journals** report and lock all posted entries.",
      "2. Reconcile Tap gateway payouts vs. ledger transactions.",
      "3. Export VAT-ready statements for compliance.",
      "",
      "Use the Workbench automation to notify stakeholders once the close checklist hits 100% completion.",
    ].join("\n"),
  },
];

const STATIC_CMS_PAGES: StaticCmsPage[] = [
  {
    slug: "saudi-fm-transformation",
    title: "Saudi FM Transformation Program",
    status: "PUBLISHED",
    updatedAt: "2024-09-18T12:00:00.000Z",
    content: [
      "# Saudi FM Transformation Program",
      "",
      "The Fixzit platform powers Vision 2030 facilities & asset operations with:",
      "",
      "- Enterprise maintenance, compliance, and inspection workflows",
      "- Unified Souq marketplace for certified vendors",
      "- Finance, HR, and analytics packs built for Saudi FM leaders",
      "",
      "Talk to our transformation office to launch the program across your portfolio in under 8 weeks.",
    ].join("\n"),
  },
  {
    slug: "souq-marketplace",
    title: "Fixzit Souq Marketplace",
    status: "PUBLISHED",
    updatedAt: "2024-08-22T15:00:00.000Z",
    content: [
      "# Fixzit Souq Marketplace",
      "",
      "Souq connects procurement teams with vetted FM vendors across the GCC.",
      "",
      "### Capabilities",
      "- Multi-vendor RFQs with SLA scoring",
      "- Digital contracts & performance dashboards",
      "- Integrated settlements with Tap Payments",
      "",
      "Onboard your supplier base in days and gain 360° visibility over every engagement.",
    ].join("\n"),
  },
];

const STATIC_JOBS: StaticJob[] = [
  {
    id: "static-job-senior-fm-analyst",
    slug: "senior-fm-analyst",
    title: "Senior FM Transformation Analyst",
    department: "Strategy & Transformation",
    status: "published",
    visibility: "public",
    descriptionHtml: [
      "<p>Join the Fixzit transformation office to help enterprise FM customers modernize operations.</p>",
      "<p>You will map processes, configure Fixzit modules, and mentor customer teams during go-live.</p>",
      "<p><strong>What you will do:</strong></p>",
      "<ul>",
      "<li>Design data-driven playbooks for maintenance, compliance, and Souq procurement.</li>",
      "<li>Lead discovery workshops with CXOs and field teams.</li>",
      "<li>Translate KPIs into dashboards and automation flows.</li>",
      "</ul>",
    ].join(""),
    requirements: [
      "6+ years in FM consulting or operations",
      "Expertise with CAFM/CMMS solutions",
      "Strong stakeholder facilitation skills",
    ],
    benefits: [
      "Hybrid work model (Riyadh HQ)",
      "Annual education & conference budget",
      "Private medical coverage for family",
    ],
    location: {
      city: "Riyadh",
      country: "Saudi Arabia",
      mode: "hybrid",
    },
  },
  {
    id: "static-job-souq-vendor-lead",
    slug: "souq-vendor-success-lead",
    title: "Souq Vendor Success Lead",
    department: "Marketplace",
    status: "published",
    visibility: "public",
    descriptionHtml: [
      "<p>Own the end-to-end success program for Fixzit Souq vendors.</p>",
      "<p>Drive onboarding, training, and quality benchmarks for suppliers serving enterprise portfolios.</p>",
    ].join(""),
    requirements: [
      "Background in marketplace account management",
      "Arabic & English fluency",
      "Experience with SLAs and quality frameworks",
    ],
    benefits: [
      "Performance bonus linked to NPS",
      "Immersive vendor immersion trips",
    ],
    location: {
      city: "Jeddah",
      country: "Saudi Arabia",
      mode: "onsite",
    },
  },
];

export function getStaticHelpArticle(slug: string): StaticHelpArticle | null {
  return STATIC_HELP_ARTICLES.find((article) => article.slug === slug) ?? null;
}

export function getStaticCmsPage(slug: string): StaticCmsPage | null {
  return STATIC_CMS_PAGES.find((page) => page.slug === slug) ?? null;
}

export function getStaticJob(slug: string): StaticJob | null {
  return STATIC_JOBS.find((job) => job.slug === slug) ?? null;
}
