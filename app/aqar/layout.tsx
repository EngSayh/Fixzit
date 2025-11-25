"use client";
import { useTranslation } from "@/contexts/TranslationContext";
import ChatWidget from "@/components/aqar/ChatWidget";

export default function AqarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Always call hooks unconditionally
  const { locale: ctxLocale, isRTL } = useTranslation();

  const locale = ctxLocale || "en";
  const dir = isRTL ? "rtl" : "ltr";

  return (
    <div dir={dir} lang={locale} className="w-full h-full">
      {children}
      <ChatWidget />
    </div>
  );
}
