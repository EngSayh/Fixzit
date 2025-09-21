"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { messages, isRTL, SUPPORTED_LOCALES } from "@/lib/i18n";
import { Globe, LogOut } from "lucide-react";

export function Header({ locale }: { locale:"en"|"ar" }) {
  const t = messages[locale];
  const [loc, setLoc] = useState(locale);

  function switchLocale() {
    const next = loc === "en" ? "ar" : "en";
    // For simplicity, live-toggle dir/lang via DOM:
    document.documentElement.lang = next;
    document.documentElement.dir = isRTL(next) ? "rtl" : "ltr";
    setLoc(next as any);
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1">
          <Input placeholder={t.app.search} />
        </div>
        <Button variant="ghost" onClick={switchLocale} title="Toggle Language">
          <Globe className="h-5 w-5" />
          <span className="ms-2">{loc.toUpperCase()}</span>
        </Button>
        <Button variant="outline">
          <LogOut className="h-5 w-5 me-2" />
          {t.app.signOut}
        </Button>
      </div>
    </header>
  );
}
