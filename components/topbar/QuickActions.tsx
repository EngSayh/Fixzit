"use client";

import { useTopBar } from "@/contexts/TopBarContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useState, useEffect, useRef } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { usePermittedQuickActions } from "@/hooks/topbar/usePermittedQuickActions";

export default function QuickActions() {
  const { quickActions } = useTopBar();
  const permittedActions = usePermittedQuickActions(quickActions);
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Close on outside click and Escape key, handle keyboard navigation
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;

      switch (event.key) {
        case "Escape":
          event.preventDefault();
          setOpen(false);
          break;
        case "ArrowDown":
          event.preventDefault();
          setActiveIndex((prev) => (prev + 1) % permittedActions.length);
          break;
        case "ArrowUp":
          event.preventDefault();
          setActiveIndex(
            (prev) =>
              (prev - 1 + permittedActions.length) % permittedActions.length,
          );
          break;
        case "Home":
          event.preventDefault();
          setActiveIndex(0);
          break;
        case "End":
          event.preventDefault();
          setActiveIndex(permittedActions.length - 1);
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          if (permittedActions[activeIndex]) {
            const action = permittedActions[activeIndex];
            // AUDIT: Log user navigation action
            import("../../lib/logger")
              .then(({ logInfo }) => {
                logInfo("[QuickActions] User navigation", {
                  component: "QuickActions",
                  action: action.id,
                  href: action.href,
                  method:
                    event.key === "Enter" ? "keyboard-enter" : "keyboard-space",
                  timestamp: new Date().toISOString(),
                });
              })
              .catch((err) => {
                logger.error("Failed to import logger:", err);
              });
            router.push(action.href);
            setOpen(false);
          }
          break;
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, activeIndex, permittedActions, router]);

  // Move focus and scroll active item into view for ARIA compliance
  useEffect(() => {
    if (!open) return;
    const node = itemRefs.current[activeIndex];
    if (node) {
      node.focus();
      node.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  if (permittedActions.length === 0) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-success text-success-foreground rounded-md hover:bg-success/90 transition-colors"
        aria-label={t("topbar.quickActions", "Quick actions")}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-medium">
          {t("topbar.quickActions", "Quick Actions")}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute ${isRTL ? "start-0" : "end-0"} top-full mt-2 w-56 bg-popover rounded-lg shadow-lg border border-border z-50`}
          role="menu"
          aria-label={t("topbar.quickActions", "Quick actions")}
        >
          <div className="p-2">
            {permittedActions.map((action, idx) => (
              <div
                key={action.id}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                role="menuitem"
                tabIndex={idx === activeIndex ? 0 : -1}
                onClick={() => {
                  // AUDIT: Log user navigation action
                  import("../../lib/logger")
                    .then(({ logInfo }) => {
                      logInfo("[QuickActions] User navigation", {
                        component: "QuickActions",
                        action: action.id,
                        href: action.href,
                        method: "click",
                        timestamp: new Date().toISOString(),
                      });
                    })
                    .catch((err) => {
                      logger.error("Failed to import logger:", err);
                    });
                  router.push(action.href);
                  setOpen(false);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors text-foreground cursor-pointer ${
                  idx === activeIndex ? "ring-2 ring-primary ring-inset" : ""
                } ${isRTL ? "flex-row-reverse text-end" : ""}`}
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {t(action.labelKey, action.labelKey)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
