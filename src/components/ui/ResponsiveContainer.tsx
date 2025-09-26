'use client&apos;;

import React from &apos;react&apos;;
import { useResponsive } from &apos;@/src/contexts/ResponsiveContext&apos;;

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: &apos;mobile&apos; | &apos;tablet&apos; | &apos;desktop&apos; | &apos;large&apos; | &apos;auto&apos;;
  padding?: &apos;none&apos; | 'small&apos; | &apos;medium&apos; | &apos;large&apos;;
  centered?: boolean;
}

export function ResponsiveContainer({
  children,
  className = &apos;',
  size = &apos;auto&apos;,
  padding = &apos;medium&apos;,
  centered = true
}: ResponsiveContainerProps) {
  const { screenInfo, responsiveClasses } = useResponsive();

  const getContainerClass = () => {
    if (size !== &apos;auto&apos;) {
      switch (size) {
        case &apos;mobile&apos;: return &apos;max-w-sm mx-auto px-4&apos;;
        case &apos;tablet&apos;: return &apos;max-w-2xl mx-auto px-6&apos;;
        case &apos;desktop&apos;: return &apos;max-w-6xl mx-auto px-8&apos;;
        case &apos;large&apos;: return &apos;max-w-7xl mx-auto px-8&apos;;
        default: return responsiveClasses.container;
      }
    }
    return responsiveClasses.container;
  };

  const getPaddingClass = () => {
    switch (padding) {
      case &apos;none&apos;: return &apos;';
      case 'small&apos;: return &apos;p-2 sm:p-3&apos;;
      case &apos;medium&apos;: return &apos;p-4 sm:p-6&apos;;
      case &apos;large&apos;: return &apos;p-6 sm:p-8&apos;;
      default: return &apos;p-4 sm:p-6&apos;;
    }
  };

  const containerClass = getContainerClass();
  const paddingClass = getPaddingClass();

  return (
    <div className={`${containerClass} ${paddingClass} ${centered ? &apos;mx-auto&apos; : &apos;'} ${className}`}>
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
  gap?: 'small&apos; | &apos;medium&apos; | &apos;large&apos;;
  className?: string;
}

export function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3, large: 4 },
  gap = &apos;medium&apos;,
  className = &apos;'
}: ResponsiveGridProps) {
  const { screenInfo } = useResponsive();

  const getGridCols = () => {
    if (screenInfo.isMobile || screenInfo.width < 640) {
      return `grid-cols-${cols.mobile || 1}`;
    }
    if (screenInfo.isTablet || screenInfo.width < 1024) {
      return `grid-cols-${cols.tablet || 2}`;
    }
    if (screenInfo.isDesktop || screenInfo.width < 1280) {
      return `grid-cols-${cols.desktop || 3}`;
    }
    return `grid-cols-${cols.large || 4}`;
  };

  const getGapClass = () => {
    switch (gap) {
      case 'small&apos;: return &apos;gap-2&apos;;
      case &apos;medium&apos;: return &apos;gap-4&apos;;
      case &apos;large&apos;: return &apos;gap-6&apos;;
      default: return &apos;gap-4&apos;;
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
  size?: 'small&apos; | &apos;medium&apos; | &apos;large&apos; | &apos;xlarge&apos;;
  weight?: &apos;normal&apos; | &apos;medium&apos; | 'semibold&apos; | &apos;bold&apos;;
  className?: string;
}

export function ResponsiveText({
  children,
  size = &apos;medium&apos;,
  weight = &apos;normal&apos;,
  className = &apos;'
}: ResponsiveTextProps) {
  const { screenInfo } = useResponsive();

  const getSizeClass = () => {
    const baseSizes = {
      small: &apos;text-sm&apos;,
      medium: &apos;text-base&apos;,
      large: &apos;text-lg&apos;,
      xlarge: &apos;text-xl&apos;
    };

    if (screenInfo.isMobile) {
      const sizeMap = {
        small: &apos;text-xs&apos;,
        medium: &apos;text-sm&apos;,
        large: &apos;text-base&apos;,
        xlarge: &apos;text-lg&apos;
      };
      return sizeMap[size];
    }

    return baseSizes[size];
  };

  const getWeightClass = () => {
    const weightMap = {
      normal: &apos;font-normal&apos;,
      medium: &apos;font-medium&apos;,
      semibold: &apos;font-semibold&apos;,
      bold: &apos;font-bold&apos;
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
  spacing?: 'small&apos; | &apos;medium&apos; | &apos;large&apos;;
  direction?: &apos;vertical&apos; | &apos;horizontal&apos;;
  className?: string;
}

export function ResponsiveSpacing({
  children,
  spacing = &apos;medium&apos;,
  direction = &apos;vertical&apos;,
  className = &apos;'
}: ResponsiveSpacingProps) {
  const { screenInfo } = useResponsive();

  const getSpacingClass = () => {
    const baseSpacing = {
      small: direction === &apos;vertical&apos; ? 'space-y-2&apos; : 'space-x-2&apos;,
      medium: direction === &apos;vertical&apos; ? 'space-y-4&apos; : 'space-x-4&apos;,
      large: direction === &apos;vertical&apos; ? 'space-y-6&apos; : 'space-x-6&apos;
    };

    if (screenInfo.isMobile) {
      const mobileSpacing = {
        small: direction === &apos;vertical&apos; ? 'space-y-1&apos; : 'space-x-1&apos;,
        medium: direction === &apos;vertical&apos; ? 'space-y-2&apos; : 'space-x-2&apos;,
        large: direction === &apos;vertical&apos; ? 'space-y-3&apos; : 'space-x-3&apos;
      };
      return mobileSpacing[spacing];
    }

    return baseSpacing[spacing];
  };

  return (
    <div className={`${getSpacingClass()} ${className}`}>
      {children}
    </div>
  );
}
