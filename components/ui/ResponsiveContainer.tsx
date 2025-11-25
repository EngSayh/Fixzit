"use client";

import React from "react";
import { useResponsiveLayout } from "@/contexts/ResponsiveContext";

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "mobile" | "tablet" | "desktop" | "large" | "auto";
  padding?: "none" | "small" | "medium" | "large";
  centered?: boolean;
}

export function ResponsiveContainer({
  children,
  className = "",
  size = "auto",
  padding = "medium",
  centered = true,
}: ResponsiveContainerProps) {
  const { responsiveClasses } = useResponsiveLayout();

  const getContainerClass = () => {
    if (size !== "auto") {
      switch (size) {
        case "mobile":
          return "max-w-sm mx-auto px-4";
        case "tablet":
          return "max-w-2xl mx-auto px-6";
        case "desktop":
          return "max-w-6xl mx-auto px-8";
        case "large":
          return "max-w-7xl mx-auto px-8";
        default:
          return responsiveClasses.container;
      }
    }
    return responsiveClasses.container;
  };

  const getPaddingClass = () => {
    switch (padding) {
      case "none":
        return "";
      case "small":
        return "p-2 sm:p-3";
      case "medium":
        return "p-4 sm:p-6";
      case "large":
        return "p-6 sm:p-8";
      default:
        return "p-4 sm:p-6";
    }
  };

  const containerClass = getContainerClass();
  const paddingClass = getPaddingClass();

  return (
    <div
      className={`${containerClass} ${paddingClass} ${centered ? "mx-auto" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

// Responsive grid component
interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    large?: number;
  };
  gap?: "small" | "medium" | "large";
  className?: string;
}

export function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3, large: 4 },
  gap = "medium",
  className = "",
}: ResponsiveGridProps) {
  const { screenInfo } = useResponsiveLayout();

  const getGridCols = () => {
    const width = screenInfo.width || 1024;
    if (screenInfo.isMobile || width < 640) {
      return `grid-cols-${cols.mobile || 1}`;
    }
    if (screenInfo.isTablet || width < 1024) {
      return `grid-cols-${cols.tablet || 2}`;
    }
    // Fixed: Changed OR to AND - both conditions must be true for desktop
    if (screenInfo.isDesktop && width < 1280) {
      return `grid-cols-${cols.desktop || 3}`;
    }
    return `grid-cols-${cols.large || 4}`;
  };

  const getGapClass = () => {
    switch (gap) {
      case "small":
        return "gap-2";
      case "medium":
        return "gap-4";
      case "large":
        return "gap-6";
      default:
        return "gap-4";
    }
  };

  return (
    <div className={`grid ${getGridCols()} ${getGapClass()} ${className}`}>
      {children}
    </div>
  );
}

// Responsive text component
interface ResponsiveTextProps {
  children: React.ReactNode;
  size?: "small" | "medium" | "large" | "xlarge";
  weight?: "normal" | "medium" | "semibold" | "bold";
  className?: string;
}

export function ResponsiveText({
  children,
  size = "medium",
  weight = "normal",
  className = "",
}: ResponsiveTextProps) {
  const { screenInfo } = useResponsiveLayout();

  const getSizeClass = () => {
    const baseSizes = {
      small: "text-sm",
      medium: "text-base",
      large: "text-lg",
      xlarge: "text-xl",
    };

    if (screenInfo.isMobile) {
      const sizeMap = {
        small: "text-xs",
        medium: "text-sm",
        large: "text-base",
        xlarge: "text-lg",
      };
      return sizeMap[size];
    }

    return baseSizes[size];
  };

  const getWeightClass = () => {
    const weightMap = {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    };
    return weightMap[weight];
  };

  return (
    <span className={`${getSizeClass()} ${getWeightClass()} ${className}`}>
      {children}
    </span>
  );
}

// Responsive spacing component
interface ResponsiveSpacingProps {
  children: React.ReactNode;
  spacing?: "small" | "medium" | "large";
  direction?: "vertical" | "horizontal";
  className?: string;
}

export function ResponsiveSpacing({
  children,
  spacing = "medium",
  direction = "vertical",
  className = "",
}: ResponsiveSpacingProps) {
  const { screenInfo } = useResponsiveLayout();

  const getSpacingClass = () => {
    const baseSpacing = {
      small: direction === "vertical" ? "space-y-2" : "space-x-2",
      medium: direction === "vertical" ? "space-y-4" : "space-x-4",
      large: direction === "vertical" ? "space-y-6" : "space-x-6",
    };

    if (screenInfo.isMobile) {
      const mobileSpacing = {
        small: direction === "vertical" ? "space-y-1" : "space-x-1",
        medium: direction === "vertical" ? "space-y-2" : "space-x-2",
        large: direction === "vertical" ? "space-y-3" : "space-x-3",
      };
      return mobileSpacing[spacing];
    }

    return baseSpacing[spacing];
  };

  return <div className={`${getSpacingClass()} ${className}`}>{children}</div>;
}
