"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

export type SuperadminSessionState = {
  authenticated: boolean;
  user?: {
    username?: string;
    role?: string;
  };
} | null;

const SuperadminSessionContext = createContext<SuperadminSessionState>(null);

type ProviderProps = {
  value: SuperadminSessionState;
  children: ReactNode;
};

export function SuperadminSessionProvider({ value, children }: ProviderProps) {
  return (
    <SuperadminSessionContext.Provider value={value}>
      {children}
    </SuperadminSessionContext.Provider>
  );
}

export function useSuperadminSession(): SuperadminSessionState {
  return useContext(SuperadminSessionContext);
}
