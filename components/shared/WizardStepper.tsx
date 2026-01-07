/**
 * WizardStepper - Multi-step wizard progress indicator
 * 
 * @description Displays wizard progress for multi-step forms like
 * Ejar contract creation, property listing, and onboarding flows.
 * 
 * @features
 * - RTL-first with logical properties
 * - Step completion tracking
 * - Step validation status
 * - Click to navigate (optional)
 * - Responsive mobile/desktop views
 */
"use client";

import React from "react";
import { Check, AlertCircle } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface WizardStep {
  id: string | number;
  label: string;
  label_ar?: string;
  description?: string;
  description_ar?: string;
  optional?: boolean;
}

export type StepStatus = "pending" | "active" | "completed" | "error";

export interface WizardStepperProps {
  /** List of all steps */
  steps: WizardStep[];
  /** Current active step index (0-based) */
  currentStep: number;
  /** Completed step indices */
  completedSteps?: number[];
  /** Steps with validation errors */
  errorSteps?: number[];
  /** Current locale */
  locale?: "ar" | "en";
  /** Callback when step is clicked (if navigation allowed) */
  onStepClick?: (stepIndex: number) => void;
  /** Whether to allow clicking on previous steps */
  allowNavigation?: boolean;
  /** Orientation */
  orientation?: "horizontal" | "vertical";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Custom class name */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WizardStepper({
  steps,
  currentStep,
  completedSteps = [],
  errorSteps = [],
  locale = "ar",
  onStepClick,
  allowNavigation = true,
  orientation = "horizontal",
  size = "md",
  className,
}: WizardStepperProps) {
  const isRTL = locale === "ar";

  const getStepStatus = (index: number): StepStatus => {
    if (errorSteps.includes(index)) return "error";
    if (completedSteps.includes(index)) return "completed";
    if (index === currentStep) return "active";
    return "pending";
  };

  const handleStepClick = (index: number) => {
    if (!allowNavigation || !onStepClick) return;
    // Allow clicking on completed steps and current step
    if (completedSteps.includes(index) || index === currentStep) {
      onStepClick(index);
    }
  };

  const sizeClasses = {
    sm: { circle: "w-6 h-6 text-xs", line: "h-0.5" },
    md: { circle: "w-8 h-8 text-sm", line: "h-0.5" },
    lg: { circle: "w-10 h-10 text-base", line: "h-1" },
  };

  const statusClasses = {
    pending: "bg-neutral-100 text-neutral-400 border-neutral-200",
    active: "bg-primary-500 text-white border-primary-500 ring-2 ring-primary-200",
    completed: "bg-primary-500 text-white border-primary-500",
    error: "bg-red-100 text-red-600 border-red-300",
  };

  const lineStatusClasses = {
    pending: "bg-neutral-200",
    active: "bg-neutral-200",
    completed: "bg-primary-500",
    error: "bg-red-300",
  };

  if (orientation === "vertical") {
    return (
      <nav
        aria-label="Progress"
        className={cn("flex flex-col space-y-4", className)}
        dir={isRTL ? "rtl" : "ltr"}
      >
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const isLast = index === steps.length - 1;
          const label = isRTL && step.label_ar ? step.label_ar : step.label;
          const description = isRTL && step.description_ar ? step.description_ar : step.description;

          return (
            <div key={step.id} className="relative flex items-start gap-4">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute start-4 top-8 w-0.5 h-full -translate-x-1/2",
                    status === "completed" ? lineStatusClasses.completed : lineStatusClasses.pending
                  )}
                />
              )}

              {/* Circle */}
              <button
                type="button"
                onClick={() => handleStepClick(index)}
                disabled={!allowNavigation || (!completedSteps.includes(index) && index !== currentStep)}
                className={cn(
                  "relative z-10 flex items-center justify-center rounded-full border-2 transition-all",
                  sizeClasses[size].circle,
                  statusClasses[status],
                  allowNavigation && (completedSteps.includes(index) || index === currentStep)
                    ? "cursor-pointer hover:ring-2 hover:ring-primary-200"
                    : "cursor-default"
                )}
                aria-current={index === currentStep ? "step" : undefined}
              >
                {status === "completed" ? (
                  <Check className="w-4 h-4" />
                ) : status === "error" ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </button>

              {/* Labels */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    status === "active" ? "text-primary-600" : "text-neutral-700",
                    status === "error" && "text-red-600"
                  )}
                >
                  {label}
                  {step.optional && (
                    <span className="ms-2 text-xs text-neutral-400">
                      {isRTL ? "(اختياري)" : "(optional)"}
                    </span>
                  )}
                </p>
                {description && (
                  <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
                )}
              </div>
            </div>
          );
        })}
      </nav>
    );
  }

  // Horizontal orientation (default)
  return (
    <nav
      aria-label="Progress"
      className={cn("flex items-center justify-between", className)}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {steps.map((step, index) => {
        const status = getStepStatus(index);
        const isLast = index === steps.length - 1;
        const label = isRTL && step.label_ar ? step.label_ar : step.label;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              {/* Circle */}
              <button
                type="button"
                onClick={() => handleStepClick(index)}
                disabled={!allowNavigation || (!completedSteps.includes(index) && index !== currentStep)}
                className={cn(
                  "flex items-center justify-center rounded-full border-2 transition-all",
                  sizeClasses[size].circle,
                  statusClasses[status],
                  allowNavigation && (completedSteps.includes(index) || index === currentStep)
                    ? "cursor-pointer hover:ring-2 hover:ring-primary-200"
                    : "cursor-default"
                )}
                aria-current={index === currentStep ? "step" : undefined}
              >
                {status === "completed" ? (
                  <Check className="w-4 h-4" />
                ) : status === "error" ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </button>

              {/* Label */}
              <p
                className={cn(
                  "mt-2 text-xs font-medium text-center max-w-[80px] truncate",
                  status === "active" ? "text-primary-600" : "text-neutral-500",
                  status === "error" && "text-red-600"
                )}
              >
                {label}
              </p>
            </div>

            {/* Connecting line */}
            {!isLast && (
              <div
                className={cn(
                  "flex-1 mx-2",
                  sizeClasses[size].line,
                  status === "completed" ? lineStatusClasses.completed : lineStatusClasses.pending
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export default WizardStepper;
