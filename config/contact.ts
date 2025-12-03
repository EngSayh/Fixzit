/**
 * Centralized contact information
 * Update these values to reflect your organization's actual contact details
 */
const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || "";
const IS_PROD = process.env.NODE_ENV === "production";
const SKIP_CONTACT_VALIDATION =
  process.env.SKIP_ENV_VALIDATION === "true" ||
  process.env.NEXT_PHASE === "phase-production-build";

// Fail fast in production to avoid shipping placeholder phone numbers
if (!CONTACT_PHONE) {
  if (IS_PROD && !SKIP_CONTACT_VALIDATION) {
    throw new Error("NEXT_PUBLIC_CONTACT_PHONE is required in production.");
  } else if (!IS_PROD && process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.warn(
      "NEXT_PUBLIC_CONTACT_PHONE is not set. The About page will hide the phone contact until configured.",
    );
  }
}

export const CONTACT_INFO = {
  organization: "Fixzit Enterprise",
  phone: CONTACT_PHONE,
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "info@fixzit.com",
  address: {
    street: process.env.NEXT_PUBLIC_CONTACT_STREET || "",
    city: process.env.NEXT_PUBLIC_CONTACT_CITY || "",
    state: process.env.NEXT_PUBLIC_CONTACT_STATE || "",
    postalCode: process.env.NEXT_PUBLIC_CONTACT_POSTAL || "",
    country: process.env.NEXT_PUBLIC_CONTACT_COUNTRY || "Saudi Arabia",
  },
  social: {
    twitter: process.env.NEXT_PUBLIC_SOCIAL_TWITTER || "",
    linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || "",
    facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || "",
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || "",
  },
} as const;
