'use client';
"use client";

import React, { useEffect, useRef, useState } from 'react';

const TRAIL_COUNT = 8; // number of trailing particles (adjust 5–10 as needed)

interface Position {
  x: number;
  y: number;
}

/**
 * Check if an element or any of its ancestors is an interactive element.
 * Used to determine when to show hover state on the custom cursor.
 */
const isInteractiveElement = (el: HTMLElement | null): boolean => {
  while (el) {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute('role') || '';
    if (
      tag === 'a' ||
      tag === 'button' ||
      tag === 'input' ||
      tag === 'select' ||
      tag === 'textarea' ||
      el.hasAttribute('data-cursor-interactive') ||
      role === 'button' ||
      role === 'link' ||
      role === 'menuitem' ||
      role === 'checkbox' ||
      role === 'switch'
    ) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
};

/**
 * CustomCursor component
 * 
 * A floating custom cursor with trailing anti-gravity particles using Fixzit brand colors.
 * - Disabled on touch devices for responsiveness
 * - Glows on interactive elements (buttons, links, inputs)
 * - Uses brand colors: #0061A8 (blue), #00A859 (green), #FFB400 (gold)
 */
const CustomCursor: React.FC = () => {
  // State for client-side detection (prevents SSR hydration mismatch)
  const [shouldRender, setShouldRender] = useState(false);
  
  // Refs for cursor elements
  const mainDotRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<HTMLDivElement[]>([]);
  // Pointer position and trailing positions
  const pointerPos = useRef<Position>({ x: 0, y: 0 });
  const trailPositions = useRef<Position[]>(
    Array.from({ length: TRAIL_COUNT }, () => ({ x: 0, y: 0 }))
  );
  // Animation frame handle
  const rafId = useRef<number | null>(null);
  // Track if component is mounted (for SSR safety)
  const isMounted = useRef(false);

  // Determine if cursor should render (client-side only to prevent SSR mismatch)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setShouldRender(true);
      return;
    }

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointerQuery = window.matchMedia('(any-pointer: fine)');
    const fallbackFinePointerQuery = window.matchMedia('(pointer: fine)');

    const addMediaListener = (query: MediaQueryList, handler: () => void) => {
      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', handler);
      } else if (typeof query.addListener === 'function') {
        query.addListener(handler);
      }
    };

    const removeMediaListener = (query: MediaQueryList, handler: () => void) => {
      if (typeof query.removeEventListener === 'function') {
        query.removeEventListener('change', handler);
      } else if (typeof query.removeListener === 'function') {
        query.removeListener(handler);
      }
    };

    const updateShouldRender = () => {
      const prefersReducedMotion = reduceMotionQuery.matches;
      const hasFinePointer = finePointerQuery.matches || fallbackFinePointerQuery.matches;
      const touchOnlyDevice =
        typeof navigator.maxTouchPoints === 'number'
          ? navigator.maxTouchPoints > 0 && !hasFinePointer
          : !hasFinePointer;

      setShouldRender(!prefersReducedMotion && !touchOnlyDevice);
    };

    const handlePointerDetected = (event: PointerEvent) => {
      if (reduceMotionQuery.matches) return;
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
        setShouldRender(true);
      }
    };

    updateShouldRender();

    addMediaListener(reduceMotionQuery, updateShouldRender);
    addMediaListener(finePointerQuery, updateShouldRender);
    addMediaListener(fallbackFinePointerQuery, updateShouldRender);
    window.addEventListener('pointermove', handlePointerDetected);
    window.addEventListener('pointerdown', handlePointerDetected);

    return () => {
      removeMediaListener(reduceMotionQuery, updateShouldRender);
      removeMediaListener(finePointerQuery, updateShouldRender);
      removeMediaListener(fallbackFinePointerQuery, updateShouldRender);
      window.removeEventListener('pointermove', handlePointerDetected);
      window.removeEventListener('pointerdown', handlePointerDetected);
    };
  }, []);

  useEffect(() => {
    if (!shouldRender) return;
    
    isMounted.current = true;

    const body = document.body;
    body.classList.add('custom-cursor-active'); // add class for custom cursor styling

    // Initialize positions to center of viewport (fallback until first mouse move)
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    pointerPos.current = { x: centerX, y: centerY };
    trailPositions.current = Array.from({ length: TRAIL_COUNT }, () => ({ x: centerX, y: centerY }));

    // Pointer move handler: update target pointer coordinates
    const handlePointerMove = (e: MouseEvent) => {
      pointerPos.current.x = e.clientX;
      pointerPos.current.y = e.clientY;
    };

    // Hover handlers for interactive elements (cursor glow)
    const handlePointerOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      if (isInteractiveElement(target) && mainDotRef.current) {
        mainDotRef.current.classList.add('cursor--hover');
      }
    };

    const handlePointerOut = (e: MouseEvent) => {
      if (!mainDotRef.current) return;
      const related = e.relatedTarget as HTMLElement;
      // If moving to another interactive element, do not remove glow yet
      if (related && isInteractiveElement(related)) {
        return;
      }
      // Otherwise, remove hover class
      mainDotRef.current.classList.remove('cursor--hover');
    };

    // Animation loop for cursor trailing effect
    const animate = () => {
      if (!isMounted.current) return;
      
      const { x: currentX, y: currentY } = pointerPos.current;
      const positions = trailPositions.current;
      // Update first trailing position (index 0) to move towards pointer
      positions[0].x += (currentX - positions[0].x) * 0.2;
      positions[0].y += (currentY - positions[0].y) * 0.2;
      // Apply slight upward drift for anti-gravity feel
      positions[0].y -= 0.5;
      // Update subsequent trailing positions to follow the one ahead
      for (let i = 1; i < TRAIL_COUNT; i++) {
        positions[i].x += (positions[i - 1].x - positions[i].x) * 0.2;
        positions[i].y += (positions[i - 1].y - positions[i].y) * 0.2;
        positions[i].y -= 0.5; // upward drift
      }
      // Position main cursor at exact pointer
      if (mainDotRef.current) {
        const translate = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
        mainDotRef.current.style.transform = translate;
      }
      // Position trailing dots
      trailRefs.current.forEach((dot, index) => {
        if (!dot) return;
        const pos = positions[index];
        const translate = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
        dot.style.transform = translate;
      });
      rafId.current = requestAnimationFrame(animate);
    };

    // Start tracking
    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('pointerover', handlePointerOver);
    document.addEventListener('pointerout', handlePointerOut);
    rafId.current = requestAnimationFrame(animate);

    return () => {
      // Cleanup on unmount
      isMounted.current = false;
      body.classList.remove('custom-cursor-active');
      document.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointerout', handlePointerOut);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [shouldRender]);

  // Don't render on server or when disabled
  if (!shouldRender) {
    return null;
  }

  // Render custom cursor elements
  return (
    <div className="custom-cursor-container" aria-hidden="true">
      <div ref={mainDotRef} className="cursor-dot cursor-main" />
      {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) trailRefs.current[i] = el;
          }}
          className="cursor-dot cursor-trail"
          // Inline styles for trailing dots (color/opacity vary by index)
          // Uses CSS variables defined in globals.css for maintainability
          style={{
            backgroundColor: i % 3 === 0 ? 'var(--cursor-primary)' : i % 3 === 1 ? 'var(--cursor-secondary)' : 'var(--cursor-accent)',
            opacity: 0.6 + (0.4 * (TRAIL_COUNT - i - 1)) / TRAIL_COUNT, // more faint for further particles
          }}
        />
      ))}
    </div>
  );
};

export default CustomCursor;
