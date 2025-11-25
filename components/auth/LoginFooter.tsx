"use client";

import Link from "next/link";
import { useTranslation } from "@/contexts/TranslationContext";

interface LoginFooterProps {
  showDemoLink?: boolean;
}

export default function LoginFooter({
  showDemoLink = false,
}: LoginFooterProps) {
  const { t, isRTL } = useTranslation();

  return (
    <div>
      {/* Sign Up Link */}
      <div className="mt-6 text-center">
        <p className="text-muted-foreground text-sm">
          {t("login.noAccount", "Don't have an account?")}{" "}
          <Link
            href="/request-demo"
            className="text-primary hover:text-primary font-medium transition-colors"
          >
            {t("login.requestDemo", "Request a demo")}
          </Link>
        </p>
      </div>

      {/* Developer Link (Development Only) */}
      {showDemoLink && (
        <div className="mt-4 pt-4 border-t border-border">
          <Link
            href="/dev/login-helpers"
            className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors flex items-center justify-center gap-1"
          >
            <span>🔧</span>
            {t("login.devHelpers", "Developer? Access test accounts")}
          </Link>
        </div>
      )}

      {/* Back to Home Link */}
      <div className="mt-6 text-center">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {isRTL
            ? `${t("common.backToHome", "Back to Home")} ←`
            : `← ${t("common.backToHome", "Back to Home")}`}
        </Link>
      </div>
    </div>
  );
}
