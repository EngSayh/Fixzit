/**
 * Test framework/library:
 * - Assumes Jest (or Vitest) + @testing-library/react with jsdom environment.
 * - Uses Testing Library best practices for React component testing.
 */
import React from "react";
import { render, screen } from "@testing-library/react";

/**
 * Import the FlagIcon component directly
 */
import { FlagIcon } from "@/components/FlagIcon";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("FlagIcon", () => {
  describe("common SVG attributes", () => {
    it("renders an SVG with correct viewBox and role for GB", () => {
      const { container } = render(<FlagIcon code="gb" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
      expect(svg).toHaveAttribute("viewBox", "0 0 24 16");
      expect(svg).toHaveAttribute("role", "img");
    });

    it("renders an SVG with correct viewBox and role for SA", () => {
      const { container } = render(<FlagIcon code="sa" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
      expect(svg).toHaveAttribute("viewBox", "0 0 24 16");
      expect(svg).toHaveAttribute("role", "img");
    });

    it("applies the provided className", () => {
      const { container } = render(
        <FlagIcon code="gb" className="flag-icon test-class" />,
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute(
        "class",
        expect.stringContaining("flag-icon"),
      );
      expect(svg).toHaveAttribute(
        "class",
        expect.stringContaining("test-class"),
      );
    });
  });

  describe("title and aria-hidden behaviour", () => {
    it("uses default title when none provided (GB) and hides from a11y with aria-hidden", () => {
      const { container } = render(<FlagIcon code="gb" />);
      const svg = container.querySelector("svg");
      // aria-hidden should be true when no explicit title is provided
      expect(svg).toHaveAttribute("aria-hidden", "true");
      // The <title> element should contain the default title
      expect(container.querySelector("title")?.textContent).toBe(
        "United Kingdom",
      );
      // Because aria-hidden is true, it should not be in the accessible tree
      expect(screen.queryByRole("img")).toBeNull();
    });

    it("uses default title when none provided (SA) and hides from a11y with aria-hidden", () => {
      const { container } = render(<FlagIcon code="sa" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(container.querySelector("title")?.textContent).toBe(
        "Saudi Arabia",
      );
      expect(screen.queryByRole("img")).toBeNull();
    });

    it("uses provided non-empty title and sets aria-hidden=false", () => {
      const { container } = render(
        <FlagIcon code="gb" title="Custom GB Flag" />,
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "false");
      expect(container.querySelector("title")?.textContent).toBe(
        "Custom GB Flag",
      );
      // With aria-hidden=false, role should be queryable
      expect(screen.getByRole("img")).toBeInTheDocument();
    });

    it("handles empty-string title as an explicit value: aria-hidden becomes true and title remains empty", () => {
      const { container } = render(<FlagIcon code="sa" title="" />);
      const svg = container.querySelector("svg");
      // \!title when title === "" is true -> aria-hidden="true"
      expect(svg).toHaveAttribute("aria-hidden", "true");
      // Nullish coalescing keeps empty string ("" is not null/undefined)
      expect(container.querySelector("title")?.textContent).toBe("");
    });
  });

  describe("SA rendering specifics", () => {
    it("renders the green background and white emblem for SA", () => {
      const { container } = render(<FlagIcon code="sa" />);
      const rects = Array.from(container.querySelectorAll("rect"));
      const paths = Array.from(container.querySelectorAll("path"));

      // Background
      expect(
        rects.some(
          (r) =>
            r.getAttribute("fill") === "#006C35" &&
            r.getAttribute("width") === "24" &&
            r.getAttribute("height") === "16",
        ),
      ).toBe(true);
      // Emblem path
      expect(
        paths.some(
          (p) =>
            p.getAttribute("fill") === "#fff" &&
            (p.getAttribute("d") || "").includes("M6 6h12v2H6z"),
        ),
      ).toBe(true);
    });
  });

  describe("GB rendering specifics", () => {
    it("renders the navy background for GB", () => {
      const { container } = render(<FlagIcon code="gb" />);
      const navyRect = Array.from(container.querySelectorAll("rect")).find(
        (r) =>
          r.getAttribute("fill") === "#012169" &&
          r.getAttribute("width") === "24" &&
          r.getAttribute("height") === "16",
      );
      expect(navyRect).toBeTruthy();
    });

    it("renders white and red diagonal crosses and central bars", () => {
      const { container } = render(<FlagIcon code="gb" />);
      const paths = Array.from(container.querySelectorAll("path"));
      const rects = Array.from(container.querySelectorAll("rect"));

      // White diagonals
      expect(
        paths.some(
          (p) =>
            p.getAttribute("stroke") === "#fff" &&
            p.getAttribute("stroke-width") === "3",
        ),
      ).toBe(true);

      // Red diagonals
      expect(
        paths.some(
          (p) =>
            p.getAttribute("stroke") === "#C8102E" &&
            p.getAttribute("stroke-width") === "1.6",
        ),
      ).toBe(true);

      // Central white and red bars (vertical + horizontal)
      const whiteBars = rects.filter((r) => r.getAttribute("fill") === "#fff");
      const redBars = rects.filter((r) => r.getAttribute("fill") === "#C8102E");

      // Expect at least the specific bars described in implementation to be present
      expect(
        whiteBars.some(
          (r) =>
            r.getAttribute("x") === "10" &&
            r.getAttribute("width") === "4" &&
            r.getAttribute("height") === "16",
        ),
      ).toBe(true);
      expect(
        whiteBars.some(
          (r) =>
            r.getAttribute("y") === "6" &&
            r.getAttribute("width") === "24" &&
            r.getAttribute("height") === "4",
        ),
      ).toBe(true);

      expect(
        redBars.some(
          (r) =>
            r.getAttribute("x") === "11" &&
            r.getAttribute("width") === "2" &&
            r.getAttribute("height") === "16",
        ),
      ).toBe(true);
      expect(
        redBars.some(
          (r) =>
            r.getAttribute("y") === "7" &&
            r.getAttribute("width") === "24" &&
            r.getAttribute("height") === "2",
        ),
      ).toBe(true);
    });
  });

  describe("focusable attribute", () => {
    it("is set to false for accessibility consistency", () => {
      const { container } = render(<FlagIcon code="gb" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("focusable", "false");
    });
  });
});
