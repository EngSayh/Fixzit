"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/config/modules";
import { messages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Sidebar({ locale }: { locale:"en"|"ar" }) {
  const t = messages[locale];
  const pathname = usePathname();

  return (
    <aside className="bg-white/80 backdrop-blur border-e min-h-screen p-3">
      <div className="px-2 py-3">
        <div className="text-lg font-bold">{t.app.title}</div>
      </div>
      <nav className="flex flex-col gap-1">
        {MODULES.map(m => {
          const active = pathname.startsWith(m.href);
          const Icon = m.icon;
          return (
            <Link key={m.key} href={m.href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
                active ? "bg-slate-900 text-white" : "hover:bg-slate-100"
              )}>
              <Icon className="h-4 w-4" />
              <span>{t.modules[m.labelKey]}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
