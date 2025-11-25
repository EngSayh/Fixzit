"use client";
import React from "react";

type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: String(err?.message || err) };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // We do not change layout; we log via window event for the agent to pick up.
    window.dispatchEvent(
      new CustomEvent("fixzit:errorBoundary", { detail: { error, info } }),
    );
  }
  render() {
    return this.props.children;
  }
}
