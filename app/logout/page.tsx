"use client";

import { useEffect } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";

import { logger } from "@/lib/logger";
export default function LogoutPage() {
  const { t } = useTranslation();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Use NextAuth signOut - it handles clearing the session cookie
        await signOut({
          callbackUrl: "/login",
          redirect: true,
        });
      } catch (error) {
        logger.error("Logout error:", error);
        // NextAuth signOut handles redirect, no manual redirect needed
      }
    };

    handleLogout();
  }, []);

  // ✅ FIX: Use standard components, semantic colors, and i18n
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center p-8">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-foreground mb-2">
          {t("logout.signingOut", "Signing you out...")}
        </h1>
        <p className="text-muted-foreground">
          {t("logout.pleaseWait", "Please wait while we log you out securely.")}
        </p>
      </div>
    </div>
  );
}
