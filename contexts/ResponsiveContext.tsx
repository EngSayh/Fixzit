"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface ResponsiveContextType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenSize: "mobile" | "tablet" | "desktop";
  // Legacy properties for backward compatibility
  screenInfo: {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isLarge: boolean;
    size: string;
    width?: number;
    height?: number;
  };
  responsiveClasses: {
    container: string;
    text: string;
    spacing: string;
  };
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(
  undefined,
);

interface ResponsiveProviderProps {
  children: ReactNode;
}

export function ResponsiveProvider({ children }: ResponsiveProviderProps) {
  // Always initialize with 'desktop' for SSR consistency
  // Will be updated on mount to prevent hydration mismatch
  const [screenSize, setScreenSize] = useState<"mobile" | "tablet" | "desktop">(
    "desktop",
  );
  const [dimensions, setDimensions] = useState<{
    width?: number;
    height?: number;
  }>({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setDimensions({ width, height });
      if (width < 768) {
        setScreenSize("mobile");
      } else if (width < 1024) {
        setScreenSize("tablet");
      } else {
        setScreenSize("desktop");
      }
    };

    // Initial check (only on client side)
    checkScreenSize();

    // Debounced resize handler to prevent excessive re-renders
    let resizeTimeout: ReturnType<typeof setTimeout> | undefined;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkScreenSize, 150);
    };

    // Add event listener with debouncing
    window.addEventListener("resize", debouncedResize);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", debouncedResize);
    };
  }, []);

  const value: ResponsiveContextType = {
    isMobile: screenSize === "mobile",
    isTablet: screenSize === "tablet",
    isDesktop: screenSize === "desktop",
    screenSize,
    // Legacy screenInfo for backward compatibility
    screenInfo: {
      isMobile: screenSize === "mobile",
      isTablet: screenSize === "tablet",
      isDesktop: screenSize === "desktop",
      isLarge: screenSize === "desktop", // Treat desktop as large
      size: screenSize,
      width: dimensions.width,
      height: dimensions.height,
    },
    // Legacy responsiveClasses for backward compatibility
    responsiveClasses: {
      container:
        screenSize === "mobile"
          ? "px-2"
          : screenSize === "tablet"
            ? "px-4"
            : "px-6",
      text: screenSize === "mobile" ? "text-sm" : "text-base",
      spacing: screenSize === "mobile" ? "space-y-2" : "space-y-4",
    },
  };

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsive(): ResponsiveContextType {
  const context = useContext(ResponsiveContext);
  if (context === undefined) {
    throw new Error("useResponsive must be used within a ResponsiveProvider");
  }
  return context;
}

// Backward compatibility alias
export const useResponsiveLayout = useResponsive;
