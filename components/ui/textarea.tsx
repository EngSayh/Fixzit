"use client";

import React, { useRef, useLayoutEffect, forwardRef } from "react";
import { logger } from "@/lib/logger";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Enables vertical auto-resizing as user types. */
  autoResize?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", autoResize = false, onChange, ...props }, ref) => {
    // Internal ref to manage the element for resizing
    const internalRef = useRef<HTMLTextAreaElement>(null);

    // --- Ref Composition ---
    // This function merges the forwarded ref (from react-hook-form)
    // with our internal ref (for auto-sizing).
    const composedRef = (el: HTMLTextAreaElement | null) => {
      // Assign to our internal ref
      if (el) {
        (
          internalRef as React.MutableRefObject<HTMLTextAreaElement | null>
        ).current = el;
      }

      // Assign to the forwarded ref
      if (typeof ref === "function") {
        ref(el);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current =
          el;
      }
    };

    // --- Auto-Resize Logic ---
    const resize = () => {
      if (!autoResize || !internalRef.current) return;

      try {
        const el = internalRef.current;
        if (!el || !(el instanceof HTMLTextAreaElement)) {
          import("../../lib/logger")
            .then(({ logWarn }) => {
              logWarn("[Textarea] resize called with invalid ref", {
                component: "Textarea",
                action: "resize",
                autoResize,
              });
            })
            .catch((logErr) =>
              logger.error("Failed to load logger:", { error: logErr }),
            );
          return;
        }
        el.style.height = "auto"; // Reset height to calculate new scrollHeight
        el.style.height = `${el.scrollHeight}px`; // Set to new scrollHeight
      } catch (error) {
        import("../../lib/logger")
          .then(({ logError }) => {
            logError("[Textarea] Auto-resize failed", error as Error, {
              component: "Textarea",
              action: "resize",
              autoResize,
            });
          })
          .catch((logErr) =>
            logger.error("Failed to load logger:", { error: logErr }),
          );
        // Graceful degradation: disable auto-resize on error
      }
    };

    // Resize on initial render and when `value` prop changes
    useLayoutEffect(() => {
      resize();
    }, [props.value, autoResize]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      // Resize on user input
      if (autoResize) {
        resize();
      }
      // Pass the event up to the parent
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <textarea
        ref={composedRef}
        className={`
          min-h-[80px] w-full rounded-2xl border border-border bg-card 
          px-3 py-2 text-sm ring-offset-white 
          placeholder:text-muted-foreground 
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 
          disabled:cursor-not-allowed disabled:opacity-50 
          ${autoResize ? "overflow-y-hidden resize-none" : ""} 
          ${className}
        `}
        onChange={handleChange}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
