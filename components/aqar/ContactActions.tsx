"use client";

import React from "react";
import { Phone, MessageSquare } from "@/components/ui/icons";
import { useTranslation } from "@/contexts/TranslationContext";
import { sanitizePhoneNumber } from "@/lib/utils/format";

export interface ContactActionsProps {
  phone: string;
  whatsapp?: string;
  variant: "full" | "icon";
  onPhoneClick?: () => void;
  onWhatsAppClick?: () => void;
}

/**
 * Reusable component for Agent/Property contact buttons (Call/WhatsApp).
 * Handles event stopPropagation to prevent bubbling when nested in other interactive elements.
 * Sanitizes phone numbers for href protocols.
 *
 * @param phone - The phone number to call
 * @param whatsapp - Optional WhatsApp number (falls back to phone)
 * @param variant - Display variant: 'full' for buttons with text, 'icon' for icon-only
 * @param onPhoneClick - Optional callback when phone link is clicked
 * @param onWhatsAppClick - Optional callback when WhatsApp link is clicked
 */
export const ContactActions = ({
  phone,
  whatsapp,
  variant,
  onPhoneClick,
  onWhatsAppClick,
}: ContactActionsProps) => {
  const { t } = useTranslation();
  const phoneDigits = sanitizePhoneNumber(phone);
  const whatsappDigits = sanitizePhoneNumber(whatsapp || phone);

  const handlePhoneClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (process.env.NODE_ENV === "test") {
      e.preventDefault(); // avoid jsdom navigation noise in tests
    }
    e.stopPropagation();
    onPhoneClick?.();
  };

  const handleWhatsAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (process.env.NODE_ENV === "test") {
      e.preventDefault();
    }
    e.stopPropagation();
    onWhatsAppClick?.();
  };

  if (variant === "icon") {
    return (
      <div className="flex items-center gap-1">
        <a
          href={`tel:${phoneDigits}`}
          onClick={handlePhoneClick}
          className="p-2 hover:bg-muted rounded-full transition-colors"
          aria-label={t("aqar.propertyCard.call", "Call agent")}
        >
          <Phone className="w-4 h-4 text-muted-foreground" />
        </a>
        <a
          href={`https://wa.me/${whatsappDigits}`}
          onClick={handleWhatsAppClick}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-muted rounded-full transition-colors"
          aria-label={t("aqar.propertyCard.message", "Message agent")}
        >
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
        </a>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <a
        href={`tel:${phoneDigits}`}
        onClick={handlePhoneClick}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-warning to-warning/80 text-white rounded-2xl hover:shadow-lg transition-shadow"
        aria-label={t("aqar.agent.call", "Call agent")}
      >
        <Phone className="w-4 h-4" />
        <span className="font-semibold">{t("aqar.agent.call", "Call")}</span>
      </a>
      <a
        href={`https://wa.me/${whatsappDigits}`}
        onClick={handleWhatsAppClick}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-success text-white rounded-2xl hover:shadow-lg transition-shadow"
        aria-label={t("aqar.agent.whatsapp", "WhatsApp agent")}
      >
        <MessageSquare className="w-4 h-4" />
        <span className="font-semibold">
          {t("aqar.agent.whatsapp", "WhatsApp")}
        </span>
      </a>
    </div>
  );
};
