"use client";

/**
 * Guided Tours Component
 * 
 * Interactive product tours using react-joyride:
 * - Dashboard Overview
 * - Work Order Creation Flow
 * - Filter Presets
 * - Bulk Actions
 * 
 * Tours can be triggered from user menu or help center
 */

import React, { useState } from "react";
import Joyride, { CallBackProps, STATUS, EVENTS, Step } from "react-joyride";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export type TourKey = "dashboard" | "work-orders" | "filter-presets" | "bulk-actions";

interface GuidedTourProps {
  tourKey: TourKey;
  run?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

type JoyrideStep = Step;

// Tour definitions
const tours = {
  dashboard: [
    {
      target: "body",
      content: "Welcome to Fixzit! Let's take a quick tour of your dashboard.",
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[data-tour="kpi-cards"]',
      content: "Here you can see your key metrics: open work orders, completion rate, and average resolution time.",
      placement: "bottom",
    },
    {
      target: '[data-tour="recent-work-orders"]',
      content: "This section shows your recent work orders. Click on any to view details.",
      placement: "top",
    },
    {
      target: '[data-tour="quick-actions"]',
      content: "Use these quick action buttons to create new work orders, invoices, or other items.",
      placement: "left",
    },
    {
      target: '[data-tour="notifications"]',
      content: "Check here for important notifications and alerts.",
      placement: "bottom",
    },
  ],

  "work-orders": [
    {
      target: "body",
      content: "Let's learn how to create and manage work orders.",
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[data-tour="create-work-order"]',
      content: "Click here to create a new work order.",
      placement: "bottom",
    },
    {
      target: '[data-tour="work-order-filters"]',
      content: "Use these filters to find specific work orders by status, priority, or assignee.",
      placement: "right",
    },
    {
      target: '[data-tour="work-order-list"]',
      content: "All your work orders are listed here. Click on any row to view or edit.",
      placement: "top",
    },
    {
      target: '[data-tour="bulk-actions"]',
      content: "Select multiple work orders to perform bulk actions like assigning or exporting.",
      placement: "top",
    },
  ],

  "filter-presets": [
    {
      target: "body",
      content: "Save time with filter presets!",
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[data-tour="filter-button"]',
      content: "Click here to open the filter panel.",
      placement: "bottom",
    },
    {
      target: '[data-tour="filter-options"]',
      content: "Select your desired filters: status, priority, date range, etc.",
      placement: "right",
    },
    {
      target: '[data-tour="save-preset"]',
      content: "Once you've configured filters, save them as a preset for future use.",
      placement: "left",
    },
    {
      target: '[data-tour="preset-dropdown"]',
      content: "Access your saved presets here. Set one as default to apply it automatically on page load.",
      placement: "bottom",
    },
  ],

  "bulk-actions": [
    {
      target: "body",
      content: "Learn how to work with multiple items at once.",
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[data-tour="select-all"]',
      content: "Check this box to select all items on the current page.",
      placement: "bottom",
    },
    {
      target: '[data-tour="row-checkbox"]',
      content: "Or select individual items by clicking their checkboxes.",
      placement: "right",
    },
    {
      target: '[data-tour="bulk-actions-bar"]',
      content: "Once items are selected, this bar appears with available bulk actions.",
      placement: "top",
    },
    {
      target: '[data-tour="bulk-export"]',
      content: "Export selected items to Excel or PDF for offline use.",
      placement: "top",
    },
    {
      target: '[data-tour="bulk-assign"]',
      content: "Assign multiple work orders to a user in one click.",
      placement: "top",
    },
  ],
} satisfies Record<TourKey, ReadonlyArray<JoyrideStep>>;

export function GuidedTour({ tourKey, run = false, onComplete, onSkip }: GuidedTourProps) {
  const [tourRunning, setTourRunning] = useState(run);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, type } = data;

    // Tour finished or skipped
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setTourRunning(false);

      if (status === STATUS.FINISHED) {
        toast.success("Tour completed!");
        onComplete?.();
      } else if (status === STATUS.SKIPPED) {
        toast.info("Tour skipped");
        onSkip?.();
      }
    }

    // Log tour events (optional - for analytics)
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      logger.info("[GuidedTour]", { status, action, type, tourKey });
    }
  };

  const steps = tours[tourKey] || [];

  return (
    <Joyride
      steps={steps}
      run={tourRunning}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableScrolling={false}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "#0061A8", // Fixzit Blue
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          fontSize: 14,
        },
        buttonNext: {
          backgroundColor: "#0061A8",
          borderRadius: 6,
        },
        buttonBack: {
          color: "#64748b",
        },
        buttonSkip: {
          color: "#94a3b8",
        },
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip Tour",
      }}
    />
  );
}

/**
 * Tour Trigger Button
 * 
 * Add to user menu or help center to launch tours
 */
interface TourTriggerProps {
  tourKey: TourKey;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function TourTrigger({ tourKey, label, variant = "outline", size = "sm" }: TourTriggerProps) {
  const [runTour, setRunTour] = useState(false);

  const tourLabels: Record<TourKey, string> = {
    dashboard: "Dashboard Tour",
    "work-orders": "Work Orders Tour",
    "filter-presets": "Filter Presets Tour",
    "bulk-actions": "Bulk Actions Tour",
  };

  const handleStart = () => {
    setRunTour(true);
    // Mark tour as seen in localStorage
    localStorage.setItem(`tour_seen_${tourKey}`, "true");
  };

  const handleComplete = () => {
    setRunTour(false);
    localStorage.setItem(`tour_completed_${tourKey}`, "true");
  };

  const handleSkip = () => {
    setRunTour(false);
    localStorage.setItem(`tour_skipped_${tourKey}`, "true");
  };

  return (
    <>
      <button
        onClick={handleStart}
        className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${
          variant === "outline"
            ? "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
            : variant === "ghost"
            ? "hover:bg-accent hover:text-accent-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        } ${
          size === "sm"
            ? "h-9 px-3 text-xs"
            : size === "lg"
            ? "h-11 px-8"
            : "h-10 px-4 py-2"
        }`}
      >
        {label || tourLabels[tourKey]}
      </button>

      <GuidedTour
        tourKey={tourKey}
        run={runTour}
        onComplete={handleComplete}
        onSkip={handleSkip}
      />
    </>
  );
}

/**
 * Check if tour should auto-run (first visit)
 */
export function useTourAutoRun(tourKey: TourKey): boolean {
  const [shouldRun, setShouldRun] = useState(false);

  React.useEffect(() => {
    const seen = localStorage.getItem(`tour_seen_${tourKey}`);
    const completed = localStorage.getItem(`tour_completed_${tourKey}`);
    const skipped = localStorage.getItem(`tour_skipped_${tourKey}`);

    // Auto-run if never seen, completed, or skipped
    if (!seen && !completed && !skipped) {
      setShouldRun(true);
    }
  }, [tourKey]);

  return shouldRun;
}
