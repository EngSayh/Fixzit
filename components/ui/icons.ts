/**
 * Centralized Icon Barrel File
 *
 * All icon imports should come from this file:
 *   import { Bell, Settings, User, Icon, IconButton } from "@/components/ui/icons";
 *
 * This provides:
 * - Single source of truth for all icons
 * - Easy migration if icon library changes
 * - DGA-compliant Icon wrapper with 1.5px stroke default
 * - Accessible IconButton with 44px touch targets
 */

// Re-export all icons from lucide-react
export * from "lucide-react";

// Re-export our custom Icon components and types
export { Icon, IconButton, iconSizeMap, iconColorMap } from "./Icon";
export type { IconProps, IconButtonProps, IconSize, IconColor, LucideIcon, LucideProps } from "./Icon";
