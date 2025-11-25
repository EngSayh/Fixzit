"use client";

import React from "react";
import { LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ✅ FIXED: Use standard components
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";

// ✅ FIXED: Add i18n support
import { useTranslation } from "@/contexts/TranslationContext";

interface LoginPromptProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  action?: string;
  redirectTo?: string;
}

/**
 * ✅ REFACTORED LoginPrompt Component
 *
 * ARCHITECTURE IMPROVEMENTS:
 * 1. ✅ Standard Dialog/Button components (no hardcoded modal/buttons)
 * 2. ✅ Full i18n support (all strings translatable)
 * 3. ✅ useRouter for navigation (no window.location.href)
 * 4. ✅ Semantic tokens (text-primary, bg-primary, text-success, border-success)
 * 5. ✅ Removed unused isSignUp state
 * 6. ✅ Fixed all hardcoded English strings
 */
export default function LoginPrompt({
  isOpen,
  onClose,
  title,
  description,
  action,
  redirectTo = "/",
}: LoginPromptProps) {
  const { t } = useTranslation();
  const router = useRouter();

  // ✅ REMOVED: unused isSignUp state

  // ✅ FIXED: Use useRouter for navigation (no window.location.href)
  const handleSignIn = () => {
    const params = new URLSearchParams();
    if (redirectTo) params.set("redirect", redirectTo);
    if (action) params.set("action", action);
    router.push(`/login?${params.toString()}`);
  };

  const handleSignUp = () => {
    const params = new URLSearchParams();
    if (redirectTo) params.set("redirect", redirectTo);
    if (action) params.set("action", action);
    router.push(`/signup?${params.toString()}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <LogIn className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle>
                {title || t("loginPrompt.title", "Sign In Required")}
              </DialogTitle>
              <DialogDescription>
                {description ||
                  t(
                    "loginPrompt.description",
                    "Please sign in to continue with this action.",
                  )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-6">
          {/* Centered Icon */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-success rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-lg font-semibold text-foreground mb-2">
              {t("loginPrompt.welcomeBack", "Welcome Back")}
            </h4>
            <p className="text-muted-foreground text-sm">
              {t(
                "loginPrompt.welcomeMessage",
                "Sign in to your Fixzit account to continue.",
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button onClick={handleSignIn} className="w-full" size="lg">
              <LogIn className="w-5 h-5 me-2" />
              {t("loginPrompt.signInButton", "Sign In with Email")}
            </Button>

            <Button
              onClick={handleSignUp}
              variant="outline"
              className="w-full border-success text-success hover:bg-success hover:text-white"
              size="lg"
            >
              <UserPlus className="w-5 h-5 me-2" />
              {t("loginPrompt.signUpButton", "Create New Account")}
            </Button>
          </div>

          {/* Benefits */}
          <div className="p-4 bg-muted rounded-2xl">
            <h5 className="font-medium text-foreground mb-2">
              {t("loginPrompt.benefitsTitle", "Why Sign In?")}
            </h5>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • {t("loginPrompt.benefit1", "Save items to your wishlist")}
              </li>
              <li>
                • {t("loginPrompt.benefit2", "Track your orders and purchases")}
              </li>
              <li>
                •{" "}
                {t("loginPrompt.benefit3", "Access exclusive deals and offers")}
              </li>
              <li>
                •{" "}
                {t("loginPrompt.benefit4", "Get personalized recommendations")}
              </li>
              <li>
                •{" "}
                {t(
                  "loginPrompt.benefit5",
                  "Manage your account and preferences",
                )}
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {t("loginPrompt.needHelp", "Need help?")}
          </span>
          <Link href="/help" className="text-sm text-primary hover:underline">
            {t("loginPrompt.contactSupport", "Contact Support")}
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
