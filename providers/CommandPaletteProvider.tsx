"use client";

/**
 * Command Palette Provider
 * 
 * Wraps the application to provide global Cmd+K command palette functionality.
 * Integrates with auth session to filter commands by user permissions/roles.
 * 
 * @module providers/CommandPaletteProvider
 */

import React from "react";
import { useSession } from "next-auth/react";
import { CommandPalette } from "@/components/ui/command-palette";
import { useThemeCtx } from "@/contexts/ThemeContext";

interface CommandPaletteProviderProps {
  children: React.ReactNode;
}

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useThemeCtx();
  
  // Extract permissions and roles from session
  const permissions = React.useMemo(() => {
    if (!session?.user) return [];
    const user = session.user as { permissions?: string[] };
    return user.permissions ?? [];
  }, [session]);
  
  const roles = React.useMemo(() => {
    if (!session?.user) return [];
    const user = session.user as { roles?: string[]; role?: string };
    const userRoles = user.roles ?? user.role;
    if (Array.isArray(userRoles)) return userRoles;
    if (typeof userRoles === "string") return [userRoles];
    return [];
  }, [session]);
  
  // Theme toggle handler
  const handleToggleTheme = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);
  
  // Modal handler (can be extended to integrate with modal system)
  const handleOpenModal = React.useCallback((modalId: string, _props?: Record<string, unknown>) => {
    // This can be connected to a global modal system
    // For now, we'll dispatch a custom event that modals can listen to
    const event = new CustomEvent("open-modal", {
      detail: { modalId, props: _props },
    });
    window.dispatchEvent(event);
  }, []);
  
  return (
    <>
      {children}
      <CommandPalette
        permissions={permissions}
        roles={roles}
        onToggleTheme={handleToggleTheme}
        onOpenModal={handleOpenModal}
      />
    </>
  );
}

export default CommandPaletteProvider;
