"use client";

/**
 * Tooltip Component
 * 
 * Re-exports the SimpleTooltip from ui/tooltip for convenience.
 * This provides a consistent tooltip experience across the app.
 * 
 * Features:
 * - Theme-aware (light/dark mode via CSS variables)
 * - RTL-compatible
 * - Accessible (uses Radix UI primitives)
 * - Smooth animations
 * 
 * @example
 * ```tsx
 * import Tooltip from '@/components/Tooltip';
 * 
 * <Tooltip content="Click to submit">
 *   <button>Submit</button>
 * </Tooltip>
 * ```
 */

export { SimpleTooltip as default } from '@/components/ui/tooltip';
export { 
  SimpleTooltip,
  Tooltip as TooltipRoot,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
