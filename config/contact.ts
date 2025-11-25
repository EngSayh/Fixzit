/**
 * Centralized contact information
 * Update these values to reflect your organization's actual contact details
 */
export const CONTACT_INFO = {
  organization: "Fixzit Enterprise",
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "+971-XX-XXX-XXXX",
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
