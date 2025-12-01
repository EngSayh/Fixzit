"use client";

import React, { useState, useRef, useId, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  /** Content to display in the tooltip */
  content: React.ReactNode;
  /** The element that triggers the tooltip */
  children: React.ReactElement;
  /** Delay before showing tooltip in ms (default: 200) */
  delay?: number;
  /** Preferred position: 'top' | 'bottom' | 'auto' (default: 'auto') */
  position?: 'top' | 'bottom' | 'auto';
}

/**
 * Tooltip component that displays contextual information on hover/focus.
 * Supports RTL and dark mode via portal positioning and CSS.
 * 
 * @example
 * ```tsx
 * <Tooltip content="Click to submit">
 *   <button>Submit</button>
 * </Tooltip>
 * ```
 */
const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  delay = 200,
  position = 'auto' 
}) => {
  const [open, setOpen] = useState(false);
  const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipId = useId(); // unique ID for aria linkage

  // Ensure portal only renders on client
  useEffect(() => {
    setMounted(true);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Show tooltip with delay
  const showTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      if (!triggerRef.current) return;
      // Compute position relative to trigger element
      const rect = triggerRef.current.getBoundingClientRect();
      const offset = 8;
      let top: number;
      let transformY: string;
      
      // Determine placement
      const shouldPlaceAbove = position === 'top' || 
        (position === 'auto' && rect.top >= 64);
      
      if (shouldPlaceAbove) {
        // Place above the element
        top = rect.top - offset;
        transformY = '-100%';
      } else {
        // Place below if not enough space above
        top = rect.bottom + offset;
        transformY = '0';
      }
      
      const left = rect.left + rect.width / 2;
      
      // Style for tooltip container
      const style: React.CSSProperties = {
        position: 'fixed',
        top: top,
        left: left,
        transform: `translate(-50%, ${transformY})`,
        zIndex: 9999,
        // CSS custom property for animation
        '--tooltip-translate-y': transformY,
      } as React.CSSProperties;
      
      setPositionStyle(style);
      setOpen(true);
    }, delay);
  }, [delay, position]);

  // Hide tooltip
  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setOpen(false);
  }, []);

  // Attach event listeners to the trigger element
  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    
    el.addEventListener('mouseenter', showTooltip);
    el.addEventListener('mouseleave', hideTooltip);
    el.addEventListener('focus', showTooltip);
    el.addEventListener('blur', hideTooltip);
    // Handle escape key to dismiss tooltip
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        hideTooltip();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      el.removeEventListener('mouseenter', showTooltip);
      el.removeEventListener('mouseleave', hideTooltip);
      el.removeEventListener('focus', showTooltip);
      el.removeEventListener('blur', hideTooltip);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showTooltip, hideTooltip, open]);

  // Merge aria-describedby and ref into child element
  const child = React.cloneElement(children, {
    ref: triggerRef,
    'aria-describedby': open ? tooltipId : undefined,
  });

  return (
    <>
      {child}
      {open && mounted &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className="tooltip-content"
            style={positionStyle}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
};

export default Tooltip;
