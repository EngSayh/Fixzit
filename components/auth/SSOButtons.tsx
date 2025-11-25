"use client";

import { useTranslation } from "@/contexts/TranslationContext";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

export default function SSOButtons() {
  const { t } = useTranslation();

  return (
    <div>
      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-card text-muted-foreground">
            {t("login.orContinueWith", "Or continue with")}
          </span>
        </div>
      </div>

      {/* SSO Buttons */}
      <div className="space-y-3">
        <GoogleSignInButton />
        {/* Future SSO providers can be added here:
          - <MicrosoftSignInButton />
          - <AppleSignInButton />
          - <LinkedInSignInButton />
        */}
      </div>
    </div>
  );
}
