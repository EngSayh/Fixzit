import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

describe("Tabs", () => {
  it("renders all tabs and shows default content", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText("Content 1")).toBeVisible();
    expect(screen.getByText("Content 2")).not.toBeVisible();
  });

  it("switches content on tab click", async () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );

    fireEvent.click(screen.getByText("Tab 2"));

    await waitFor(() => {
      expect(screen.getByText("Content 2")).toBeVisible();
      expect(screen.getByText("Content 1")).not.toBeVisible();
    });
  });

  it("handles controlled mode", () => {
    const { rerender } = render(
      <Tabs value="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText("Content 1")).toBeVisible();

    rerender(
      <Tabs value="tab2">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText("Content 2")).toBeVisible();
  });

  it("calls onValueChange when tab changes", async () => {
    const handleChange = vi.fn();
    render(
      <Tabs defaultValue="tab1" onValueChange={handleChange}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );

    fireEvent.click(screen.getByText("Tab 2"));

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith("tab2");
    });
  });

  it("handles keyboard navigation (ArrowRight)", async () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );

    const tab1 = screen.getByText("Tab 1");
    tab1.focus();
    fireEvent.keyDown(tab1, { key: "ArrowRight" });

    await waitFor(() => {
      expect(screen.getByText("Tab 2")).toHaveFocus();
      expect(screen.getByText("Content 2")).toBeVisible();
    });
  });

  it("handles keyboard navigation (ArrowLeft)", async () => {
    render(
      <Tabs defaultValue="tab2">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );

    const tab2 = screen.getByText("Tab 2");
    tab2.focus();
    fireEvent.keyDown(tab2, { key: "ArrowLeft" });

    await waitFor(() => {
      expect(screen.getByText("Tab 1")).toHaveFocus();
      expect(screen.getByText("Content 1")).toBeVisible();
    });
  });

  it("handles Home key navigation", async () => {
    render(
      <Tabs defaultValue="tab3">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
        <TabsContent value="tab3">Content 3</TabsContent>
      </Tabs>,
    );

    const tab3 = screen.getByText("Tab 3");
    tab3.focus();
    fireEvent.keyDown(tab3, { key: "Home" });

    await waitFor(() => {
      expect(screen.getByText("Tab 1")).toHaveFocus();
      expect(screen.getByText("Content 1")).toBeVisible();
    });
  });

  it("handles End key navigation", async () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
        <TabsContent value="tab3">Content 3</TabsContent>
      </Tabs>,
    );

    const tab1 = screen.getByText("Tab 1");
    tab1.focus();
    fireEvent.keyDown(tab1, { key: "End" });

    await waitFor(() => {
      expect(screen.getByText("Tab 3")).toHaveFocus();
      expect(screen.getByText("Content 3")).toBeVisible();
    });
  });

  it("applies active styling to current tab", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1" data-testid="tab1">
            Tab 1
          </TabsTrigger>
          <TabsTrigger value="tab2" data-testid="tab2">
            Tab 2
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );

    const tab1 = screen.getByTestId("tab1");
    expect(tab1).toHaveAttribute("aria-selected", "true");
    expect(tab1).toHaveAttribute("tabIndex", "0");

    const tab2 = screen.getByTestId("tab2");
    expect(tab2).toHaveAttribute("aria-selected", "false");
    expect(tab2).toHaveAttribute("tabIndex", "-1");
  });

  it("preserves inactive tab content with hidden attribute", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2" data-testid="tab2-content">
          Content 2
        </TabsContent>
      </Tabs>,
    );

    const inactiveContent = screen.getByTestId("tab2-content");
    expect(inactiveContent).toHaveAttribute("hidden");
  });

  it("wraps around when navigating past the last tab", async () => {
    render(
      <Tabs defaultValue="tab2">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );

    const tab2 = screen.getByText("Tab 2");
    tab2.focus();
    fireEvent.keyDown(tab2, { key: "ArrowRight" });

    await waitFor(() => {
      expect(screen.getByText("Tab 1")).toHaveFocus();
    });
  });
});
