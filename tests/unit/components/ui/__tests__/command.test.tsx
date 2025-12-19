import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandShortcut } from "@/components/ui/command";

describe("CommandShortcut", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses logical spacing class for RTL safety", () => {
    render(<CommandShortcut>Cmd</CommandShortcut>);
    const element = screen.getByText("Cmd");
    expect(element).toHaveClass("ms-auto");
    expect(element).not.toHaveClass("ml-auto");
  });

  it("merges custom className", () => {
    render(<CommandShortcut className="custom-class">Cmd</CommandShortcut>);
    expect(screen.getByText("Cmd")).toHaveClass("custom-class");
  });
});
