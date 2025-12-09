"use client";

import React, { createContext, useContext, useState, useId } from "react";

// --- Types ---

interface TabsContextProps {
  value: string;
  onValueChange: (value: string) => void;
  /** A unique ID for this tabs instance to link triggers and content */
  baseId: string;
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The value of the tab that should be active by default. */
  defaultValue?: string;
  /** The controlled value of the active tab. */
  value?: string;
  /** Event handler for when the active tab changes. */
  onValueChange?: (value: string) => void;
}

type TabsListProps = React.HTMLAttributes<HTMLDivElement>;

interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** A unique value for this tab trigger. */
  value: string;
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** A unique value for this tab content, matching its trigger. */
  value: string;
}

// --- Context ---

const TabsContext = createContext<TabsContextProps | null>(null);

/** Custom hook to ensure context is used within a Tabs component */
const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a <Tabs> provider.");
  }
  return context;
};

// --- Components ---

export const Tabs: React.FC<TabsProps> = ({
  className = "",
  defaultValue = "",
  value: controlledValue,
  onValueChange: controlledOnChange,
  children,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);

  // Generate a unique base ID for ARIA
  const baseId = useId();

  // Determine if the component is controlled or uncontrolled
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const onValueChange = controlledOnChange || setInternalValue;

  return (
    <TabsContext.Provider value={{ value, onValueChange, baseId }}>
      <div className={`w-full ${className}`} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};
Tabs.displayName = "Tabs";

export const TabsList: React.FC<TabsListProps> = ({
  className = "",
  children,
  ...props
}) => {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={`
        inline-flex h-10 items-center justify-center rounded-2xl 
        bg-muted p-1 text-muted-foreground ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
TabsList.displayName = "TabsList";

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  className = "",
  value,
  children,
  ...props
}) => {
  const { value: selectedValue, onValueChange, baseId } = useTabsContext();
  const isActive = value === selectedValue;
  const triggerId = `${baseId}-trigger-${value}`;
  const contentId = `${baseId}-content-${value}`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const target = e.currentTarget;
    const tablist = target.closest('[role="tablist"]');
    if (!tablist) return;

    // Filter out disabled tabs from navigation
    const triggers = Array.from(
      tablist.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]:not(:disabled)',
      ),
    );
    if (triggers.length === 0) return;

    const currentIndex = triggers.findIndex((el) => el === target);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        nextIndex = (currentIndex + 1) % triggers.length;
        break;
      case "ArrowLeft":
        e.preventDefault();
        nextIndex = (currentIndex - 1 + triggers.length) % triggers.length;
        break;
      case "Home":
        e.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        e.preventDefault();
        nextIndex = triggers.length - 1;
        break;
      default:
        return;
    }

    // Set focus and activate the new tab
    const nextTrigger = triggers[nextIndex];
    if (!nextTrigger) return;

    nextTrigger.focus();
    const nextValue = nextTrigger.dataset.value;
    if (nextValue !== undefined) {
      onValueChange(nextValue);
    }
  };

  return (
    <button
      id={triggerId}
      role="tab"
      aria-selected={isActive}
      aria-controls={contentId}
      tabIndex={isActive ? 0 : -1} // Only the active tab is in the tab sequence
      data-value={value} // Store value for keyboard navigation logic
      className={`
        inline-flex items-center justify-center whitespace-nowrap rounded-sm 
        px-3 py-1.5 text-sm font-medium ring-offset-white transition-all 
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 
        disabled:pointer-events-none disabled:opacity-50
        ${
          isActive
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        } 
        ${className}
      `}
      onClick={() => onValueChange(value)}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </button>
  );
};
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent: React.FC<TabsContentProps> = ({
  className = "",
  value,
  children,
  ...props
}) => {
  const { value: selectedValue, baseId } = useTabsContext();
  const isActive = value === selectedValue;
  const triggerId = `${baseId}-trigger-${value}`;
  const contentId = `${baseId}-content-${value}`;

  return (
    <div
      id={contentId}
      role="tabpanel"
      aria-labelledby={triggerId}
      // Use the 'hidden' attribute to hide/show.
      // This keeps the component mounted and preserves its state.
      hidden={!isActive}
      className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
TabsContent.displayName = "TabsContent";
