import { notFound } from "next/navigation";
import DevLoginClient from "./DevLoginClient";

/**
 * Server component gate for dev login helpers
 * Hard-blocks in production unless explicitly enabled
 * Uses server-only ENABLE_DEMO_LOGIN (NOT NEXT_PUBLIC_)
 */
export default async function Page() {
  const enabled =
    process.env.ENABLE_DEMO_LOGIN === "true" ||
    process.env.NODE_ENV === "development";

  if (!enabled) {
    return notFound(); // Hard-block in prod without the flag
  }

  // No secrets here—client will fetch sanitized data from API
  return <DevLoginClient />;
}

export const metadata = {
  title: "Dev Login Helpers | Fixzit",
  description: "Developer-only quick login utility",
};
