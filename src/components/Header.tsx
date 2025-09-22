// DEPRECATED: This component is duplicated by TopBar.tsx
// Use TopBar.tsx instead as it has better functionality and integration
// This file is kept for backward compatibility but should be removed

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Globe, ChevronDown, ChevronUp, Search, ShoppingBag, Building2, Settings2 } from "lucide-react";

type Lang = "en" | "ar";
type Curr = "SAR" | "USD" | "EUR";

// @deprecated Use TopBar.tsx instead - this component is redundant
export default function Header() {
  const [lang, setLang] = useState<Lang>("en");
  const [curr, setCurr] = useState<Curr>("SAR");
  const [openLang, setOpenLang] = useState(false);
  const [openCurr, setOpenCurr] = useState(false);

  useEffect(() => {
    const l = (localStorage.getItem("fxz.lang") as Lang) || "en";
    const c = (localStorage.getItem("fxz-curr") as Curr) || "SAR";
    setLang(l); setCurr(c);
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = l;
  }, []);

  const setLanguage = (l: Lang) => {
    setLang(l);
    localStorage.setItem("fxz.lang", l);
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = l;
    setOpenLang(false);
  };

  const setCurrency = (c: Curr) => {
    setCurr(c);
    localStorage.setItem("fxz-curr", c);
    setOpenCurr(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-[#023047] via-[#0061A8] to-[#00A859] text-white shadow">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-3 flex items-center gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <img src="/logo.svg" alt="Fixzit" className="h-8 w-8" />
          <span className="text-lg">Fixzit</span>
        </Link>

        {/* Global Search */}
        <div className="relative flex-1 max-w-2xl mx-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 opacity-70" />
          <input
            className="w-full rounded-full bg-white/90 text-black pl-10 pr-4 py-2 outline-none focus:ring-2 focus:ring-white/60"
            placeholder={lang === "ar" ? "بحث عام..." : "Global search…"}
          />
        </div>

        {/* Primary Top Buttons */}
        <nav className="hidden md:flex items-center gap-2">
          <Link href="/souq" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20 transition">
            <ShoppingBag className="h-4 w-4" /> {lang === "ar" ? "سوق المواد" : "Fixzit Souq"}
          </Link>
          <Link href="/aqar" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20 transition">
            <Building2 className="h-4 w-4" /> {lang === "ar" ? "عقار سوق" : "Aqar Souq"}
          </Link>
          <Link href="/fm" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20 transition">
            <Settings2 className="h-4 w-4" /> {lang === "ar" ? "إدارة المرافق" : "Facility Management"}
          </Link>
        </nav>

        <div className="flex-1" />

        {/* Currency */}
        <div className="relative">
          <button onClick={() => setOpenCurr(v => !v)} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20 transition">
            <span>{curr}</span>{openCurr ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {openCurr && (
            <div className="absolute right-0 mt-2 w-28 rounded-lg bg-white text-black shadow">
              {(["SAR","USD","EUR"] as Curr[]).map(c => (
                <button key={c} onClick={() => setCurrency(c)} className="w-full text-left px-3 py-2 hover:bg-gray-100">{c}</button>
              ))}
            </div>
          )}
        </div>

        {/* Language */}
        <div className="relative">
          <button onClick={() => setOpenLang(v => !v)} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20 transition">
            <Globe className="h-4 w-4" />
            <span className="uppercase">{lang}</span>
            {openLang ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {openLang && (
            <div className="absolute right-0 mt-2 w-28 rounded-lg bg-white text-black shadow">
              <button onClick={() => setLanguage("en")} className="w-full text-left px-3 py-2 hover:bg-gray-100">English</button>
              <button onClick={() => setLanguage("ar")} className="w-full text-left px-3 py-2 hover:bg-gray-100">العربية</button>
            </div>
          )}
        </div>

        {/* Notifications (empty for guests unless public news exists) */}
        <button className="ml-2 inline-flex items-center justify-center rounded-full bg-white/10 p-2 hover:bg-white/20" title="Notifications">
          <Bell className="h-5 w-5" />
        </button>

        {/* Profile / Login */}
        <Link href="/login" className="ml-1 inline-flex items-center rounded-full bg-white px-3 py-1.5 text-[#023047] font-medium hover:opacity-90">
          {lang === "ar" ? "تسجيل الدخول" : "Login"}
        </Link>
      </div>
    </header>
  );
}

