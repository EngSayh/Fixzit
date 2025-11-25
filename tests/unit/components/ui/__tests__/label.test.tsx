import React, { useRef } from "react";
import { render, screen } from "@testing-library/react";
import { Label } from "@/components/ui/label";

describe("Label", () => {
  it("renders with text", () => {
    render(<Label>Username</Label>);
    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("forwards ref correctly", () => {
    const TestComponent = () => {
      const ref = useRef<HTMLLabelElement>(null);
      return (
        <Label ref={ref} data-testid="label">
          Test
        </Label>
      );
    };
    render(<TestComponent />);
    expect(screen.getByTestId("label")).toBeInstanceOf(HTMLLabelElement);
  });

  it("applies custom className", () => {
    render(<Label className="custom-class">Test</Label>);
    expect(screen.getByText("Test")).toHaveClass("custom-class");
  });

  it("associates with input via htmlFor", () => {
    render(
      <>
        <Label htmlFor="test-input">Test Label</Label>
        <input id="test-input" />
      </>,
    );
    const label = screen.getByText("Test Label");
    expect(label).toHaveAttribute("for", "test-input");
  });
});
