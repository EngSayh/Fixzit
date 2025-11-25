"use client";

import { Check } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";

export default function LoginSuccess() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-success" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t("login.success.title", "Welcome Back!")}
        </h2>
        <p className="text-muted-foreground mb-4">
          {t("login.success.message", "Signing you in...")}
        </p>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary animate-pulse"
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
