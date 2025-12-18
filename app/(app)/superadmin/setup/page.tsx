import { SetupWizard } from "@/components/superadmin/SetupWizard";

export const metadata = {
  title: "Setup Wizard | Fixzit",
  description: "First-time setup for your organization",
};

/**
 * Superadmin setup wizard page
 * 
 * Shown on first login when org.setup_complete === false
 * Redirects to dashboard once complete
 */
export default function SuperadminSetupPage() {
  return <SetupWizard />;
}
