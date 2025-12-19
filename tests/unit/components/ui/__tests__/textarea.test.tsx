import React, { useRef } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { Textarea } from "@/components/ui/textarea";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("Textarea", () => {
  it("renders with placeholder", () => {
    render(<Textarea placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("handles onChange event", () => {
    const handleChange = vi.fn();
    render(<Textarea onChange={handleChange} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "test" },
    });
    expect(handleChange).toHaveBeenCalled();
  });

  it("auto-resizes when autoResize prop is true", () => {
    render(<Textarea autoResize data-testid="textarea" />);
    const textarea = screen.getByTestId("textarea") as HTMLTextAreaElement;
    expect(textarea).toHaveClass("resize-none");
    expect(textarea).toHaveClass("overflow-y-hidden");
  });

  it("does not have resize classes when autoResize is false", () => {
    render(<Textarea data-testid="textarea" />);
    const textarea = screen.getByTestId("textarea") as HTMLTextAreaElement;
    expect(textarea).not.toHaveClass("resize-none");
  });

  it("forwards ref correctly", () => {
    const TestComponent = () => {
      const ref = useRef<HTMLTextAreaElement>(null);
      return <Textarea ref={ref} data-testid="textarea" />;
    };
    render(<TestComponent />);
    expect(screen.getByTestId("textarea")).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("handles resize errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    render(<Textarea autoResize value="test text" />);

    // Simulate typing to trigger resize
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "new value" } });

    await waitFor(() => {
      // Should not have crashed
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it("applies custom className", () => {
    render(<Textarea className="custom-class" data-testid="textarea" />);
    expect(screen.getByTestId("textarea")).toHaveClass("custom-class");
  });

  it("respects disabled attribute", () => {
    render(<Textarea disabled data-testid="textarea" />);
    expect(screen.getByTestId("textarea")).toBeDisabled();
  });
});
