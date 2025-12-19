import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ContactActions } from "@/components/aqar/ContactActions";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


const ORIGINAL_LOCATION = window.location;

// Mock the translation context
vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback || key,
    isRTL: false,
  }),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Phone: () => <div data-testid="phone-icon" />,
  MessageSquare: () => <div data-testid="whatsapp-icon" />,
}));

beforeAll(() => {
  Object.defineProperty(window, "location", {
    value: {
      ...ORIGINAL_LOCATION,
      assign: vi.fn(),
      replace: vi.fn(),
      href: "",
    },
    writable: true,
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", {
    value: ORIGINAL_LOCATION,
    writable: true,
  });
});

describe("ContactActions", () => {
  describe("Full Variant (Buttons)", () => {
    it("renders call and whatsapp buttons with correct text", () => {
      render(<ContactActions phone="0501234567" variant="full" />);
      expect(screen.getByLabelText("Call agent")).toBeInTheDocument();
      expect(screen.getByText("Call")).toBeInTheDocument();
      expect(screen.getByLabelText("WhatsApp agent")).toBeInTheDocument();
      expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    });

    it("sanitizes hrefs for call and whatsapp links, preserving leading plus", () => {
      render(
        <ContactActions
          phone="+966 (050) 123-4567"
          whatsapp="050 987 6543"
          variant="full"
        />,
      );

      const callLink = screen.getByLabelText("Call agent") as HTMLAnchorElement;
      const waLink = screen.getByLabelText(
        "WhatsApp agent",
      ) as HTMLAnchorElement;

      expect(callLink.href).toBe("tel:+9660501234567");
      expect(waLink.href).toBe("https://wa.me/0509876543");
    });

    it("falls back to phone for whatsapp link if whatsapp number is missing", () => {
      render(<ContactActions phone="+966 555 111 222" variant="full" />);
      const waLink = screen.getByLabelText(
        "WhatsApp agent",
      ) as HTMLAnchorElement;
      expect(waLink.href).toBe("https://wa.me/+966555111222");
    });

    it("stops event propagation when clicked", () => {
      const parentClickHandler = vi.fn();
      render(
        <div onClick={parentClickHandler}>
          <ContactActions phone="0501234567" variant="full" />
        </div>,
      );

      fireEvent.click(screen.getByText("Call"));
      fireEvent.click(screen.getByText("WhatsApp"));

      expect(parentClickHandler).not.toHaveBeenCalled();
    });

    it("calls optional callbacks when provided", () => {
      const onPhoneClick = vi.fn();
      const onWhatsAppClick = vi.fn();

      render(
        <ContactActions
          phone="0501234567"
          variant="full"
          onPhoneClick={onPhoneClick}
          onWhatsAppClick={onWhatsAppClick}
        />,
      );

      fireEvent.click(screen.getByText("Call"));
      fireEvent.click(screen.getByText("WhatsApp"));

      expect(onPhoneClick).toHaveBeenCalledTimes(1);
      expect(onWhatsAppClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Icon Variant", () => {
    it("renders call and whatsapp icons", () => {
      render(<ContactActions phone="0501234567" variant="icon" />);
      expect(screen.getByLabelText("Call agent")).toBeInTheDocument();
      expect(screen.getByTestId("phone-icon")).toBeInTheDocument();
      expect(screen.getByLabelText("Message agent")).toBeInTheDocument();
      expect(screen.getByTestId("whatsapp-icon")).toBeInTheDocument();
    });

    it("sanitizes hrefs for call and whatsapp icon links", () => {
      render(
        <ContactActions
          phone="(050) 123-4567"
          whatsapp=" 050 987 6543 "
          variant="icon"
        />,
      );

      const callLink = screen.getByLabelText("Call agent") as HTMLAnchorElement;
      const waLink = screen.getByLabelText(
        "Message agent",
      ) as HTMLAnchorElement;

      expect(callLink.href).toBe("tel:0501234567");
      expect(waLink.href).toBe("https://wa.me/0509876543");
    });

    it("stops event propagation when icons are clicked", () => {
      const parentClickHandler = vi.fn();
      render(
        <div onClick={parentClickHandler}>
          <ContactActions phone="0501234567" variant="icon" />
        </div>,
      );

      fireEvent.click(screen.getByLabelText("Call agent"));
      fireEvent.click(screen.getByLabelText("Message agent"));

      expect(parentClickHandler).not.toHaveBeenCalled();
    });

    it("has correct security attributes on WhatsApp link", () => {
      render(<ContactActions phone="0501234567" variant="icon" />);
      const waLink = screen.getByLabelText(
        "Message agent",
      ) as HTMLAnchorElement;

      expect(waLink.target).toBe("_blank");
      expect(waLink.rel).toBe("noopener noreferrer");
    });
  });
});
