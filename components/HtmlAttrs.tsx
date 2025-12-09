'use client';
"use client";

import { useEffect } from "react";
import { useTranslation } from "@/contexts/TranslationContext";

/**
 * Updates the html element's lang and dir attributes based on the current language context.
 * Must be used within TranslationProvider.
 */
export default function HtmlAttrs() {
  const { language, isRTL } = useTranslation();

  useEffect(() => {
    if (typeof document !== "undefined") {
      const resolvedLang = language || "en";
      const resolvedDir = isRTL ? "rtl" : "ltr";
      // Explicitly set both attributes to avoid null dir reads in tests
      document.documentElement.setAttribute("lang", resolvedLang);
      document.documentElement.setAttribute("dir", resolvedDir);
      document.documentElement.lang = resolvedLang;
      document.documentElement.dir = resolvedDir;
    }
  }, [language, isRTL]);

  return null;
}
