import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { Select, SelectItem, SelectGroup } from "@/components/ui/select";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("Select", () => {
  it("renders with placeholder", () => {
    render(
      <Select placeholder="Choose option" data-testid="select">
        <SelectItem value="1">Option 1</SelectItem>
      </Select>,
    );
    expect(screen.getByText("Choose option")).toBeInTheDocument();
  });

  it("shows placeholder by default when uncontrolled", () => {
    render(
      <Select placeholder="Select..." data-testid="select">
        <SelectItem value="1">Option 1</SelectItem>
      </Select>,
    );
    const select = screen.getByTestId("select") as HTMLSelectElement;
    expect(select.value).toBe("");
  });

  it("calls onValueChange when selection changes", () => {
    const handleChange = vi.fn();
    render(
      <Select
        onValueChange={handleChange}
        placeholder="Choose"
        data-testid="select"
      >
        <SelectItem value="1">Option 1</SelectItem>
        <SelectItem value="2">Option 2</SelectItem>
      </Select>,
    );
    const select = screen.getByTestId("select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "2" } });
    expect(handleChange).toHaveBeenCalledWith("2");
  });

  it("calls both onChange and onValueChange", () => {
    const handleChange = vi.fn();
    const handleValueChange = vi.fn();
    render(
      <Select
        onChange={handleChange}
        onValueChange={handleValueChange}
        data-testid="select"
      >
        <SelectItem value="1">Option 1</SelectItem>
        <SelectItem value="2">Option 2</SelectItem>
      </Select>,
    );
    const select = screen.getByTestId("select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "2" } });
    expect(handleChange).toHaveBeenCalled();
    expect(handleValueChange).toHaveBeenCalledWith("2");
  });

  it("renders SelectItem children correctly", () => {
    render(
      <Select data-testid="select">
        <SelectItem value="1">First Option</SelectItem>
        <SelectItem value="2">Second Option</SelectItem>
      </Select>,
    );
    expect(screen.getByText("First Option")).toBeInTheDocument();
    expect(screen.getByText("Second Option")).toBeInTheDocument();
  });

  it("renders SelectGroup with label", () => {
    render(
      <Select data-testid="select">
        <SelectGroup label="Group 1">
          <SelectItem value="1">Option 1</SelectItem>
          <SelectItem value="2">Option 2</SelectItem>
        </SelectGroup>
      </Select>,
    );
    const optgroup = screen.getByRole("group");
    expect(optgroup).toHaveAttribute("label", "Group 1");
  });

  it("respects controlled value", () => {
    const { rerender } = render(
      <Select value="1" data-testid="select">
        <SelectItem value="1">Option 1</SelectItem>
        <SelectItem value="2">Option 2</SelectItem>
      </Select>,
    );
    const select = screen.getByTestId("select") as HTMLSelectElement;
    expect(select.value).toBe("1");

    rerender(
      <Select value="2" data-testid="select">
        <SelectItem value="1">Option 1</SelectItem>
        <SelectItem value="2">Option 2</SelectItem>
      </Select>,
    );
    expect(select.value).toBe("2");
  });

  it("respects defaultValue for uncontrolled component", () => {
    render(
      <Select defaultValue="2" data-testid="select">
        <SelectItem value="1">Option 1</SelectItem>
        <SelectItem value="2">Option 2</SelectItem>
      </Select>,
    );
    const select = screen.getByTestId("select") as HTMLSelectElement;
    expect(select.value).toBe("2");
  });

  it("renders chevron icon", () => {
    const { container } = render(
      <Select>
        <SelectItem value="1">Option 1</SelectItem>
      </Select>,
    );
    const chevron = container.querySelector("svg");
    expect(chevron).toBeInTheDocument();
    expect(chevron).toHaveAttribute("aria-hidden", "true");
  });

  it("applies custom wrapperClassName", () => {
    const { container } = render(
      <Select wrapperClassName="custom-wrapper">
        <SelectItem value="1">Option 1</SelectItem>
      </Select>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("custom-wrapper");
  });

  it("disables SelectItem when disabled prop is true", () => {
    render(
      <Select data-testid="select">
        <SelectItem value="1" disabled>
          Disabled Option
        </SelectItem>
        <SelectItem value="2">Enabled Option</SelectItem>
      </Select>,
    );
    const disabledOption = screen.getByText(
      "Disabled Option",
    ) as HTMLOptionElement;
    expect(disabledOption.disabled).toBe(true);
  });
});
