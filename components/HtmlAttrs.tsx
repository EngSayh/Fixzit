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
      document.documentElement.lang = language;
      document.documentElement.dir = isRTL ? "rtl" : "ltr";
    }
  }, [language, isRTL]);

  return null;
}
