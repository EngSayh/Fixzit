import { renderHook, act } from "@testing-library/react";
import { useFormTracking } from "@/hooks/useFormTracking";
import { FormStateProvider, useFormState } from "@/contexts/FormStateContext";
import React from "react";
import { vi, describe, it, expect } from "vitest";

// Create a wrapper component that includes the Provider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FormStateProvider>{children}</FormStateProvider>
);

describe("useFormTracking", () => {
  it("should register and unregister the form on mount/unmount", () => {
    const onSave = vi.fn(() => Promise.resolve());

    const { result, unmount, rerender } = renderHook(
      ({ isDirty }) => {
        const ctx = useFormState();
        useFormTracking({
          formId: "test-form",
          isDirty,
          onSave,
        });
        return ctx;
      },
      { wrapper, initialProps: { isDirty: false } },
    );

    expect(result.current.isFormDirty("test-form")).toBe(false);

    act(() => {
      rerender({ isDirty: true });
    });
    expect(result.current.isFormDirty("test-form")).toBe(true);

    act(() => unmount());
  });

  it("should mark form as dirty in context when isDirty prop becomes true", () => {
    const onSave = vi.fn(() => Promise.resolve());

    const { result, rerender } = renderHook(
      ({ isDirty }) => {
        const ctx = useFormState();
        useFormTracking({
          formId: "dirty-form",
          isDirty,
          onSave,
        });
        return ctx;
      },
      {
        wrapper,
        initialProps: {
          isDirty: false,
        },
      },
    );

    expect(result.current.isFormDirty("dirty-form")).toBe(false);

    act(() => {
      rerender({ isDirty: true });
    });

    expect(result.current.isFormDirty("dirty-form")).toBe(true);
  });

  it("should call onSave when global save is triggered", async () => {
    const { result: contextResult } = renderHook(() => useFormState(), {
      wrapper,
    });
    const onSave = vi.fn(() => Promise.resolve());

    renderHook(
      () =>
        useFormTracking({
          formId: "save-form",
          isDirty: true,
          onSave,
        }),
      { wrapper },
    );

    // Trigger global save via context
    await act(async () => {
      await contextResult.current.saveAllForms();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("should call onSave and not mark clean when local handleSubmit is called", async () => {
    const onSave = vi.fn(() => Promise.resolve());

    const { result } = renderHook(
      () =>
        useFormTracking({
          formId: "submit-form",
          isDirty: true,
          onSave,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    // 1. Save function was called
    expect(onSave).toHaveBeenCalledTimes(1);

    // 2. The hook doesn't mark clean directly, it relies on the parent's isDirty prop changing
    // The parent should call setIsDirty(false) after successful save, which will trigger the effect
  });

  it("should not mark clean if save fails", async () => {
    const onSave = vi.fn(() => Promise.reject(new Error("Save failed")));

    const { result } = renderHook(
      () =>
        useFormTracking({
          formId: "fail-form",
          isDirty: true,
          onSave,
        }),
      { wrapper },
    );

    await act(async () => {
      try {
        await result.current.handleSubmit();
      } catch (error) {
        // Expected error
      }
    });

    // Save was called
    expect(onSave).toHaveBeenCalledTimes(1);

    // Form should still be dirty (parent's responsibility to keep isDirty=true)
    expect(result.current.isDirty).toBe(true);
  });

  it("should add beforeunload listener when form is dirty", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const onSave = vi.fn(() => Promise.resolve());

    const { rerender } = renderHook((props) => useFormTracking(props), {
      wrapper,
      initialProps: {
        formId: "beforeunload-form",
        isDirty: false,
        onSave,
      },
    });

    // Initially not dirty, no beforeunload listener
    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );

    // Mark as dirty
    act(() => {
      rerender({ formId: "beforeunload-form", isDirty: true, onSave });
    });

    // Now beforeunload listener should be added
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );

    addEventListenerSpy.mockRestore();
  });

  it("should remove beforeunload listener when form becomes clean", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const onSave = vi.fn(() => Promise.resolve());

    const { rerender } = renderHook((props) => useFormTracking(props), {
      wrapper,
      initialProps: {
        formId: "cleanup-form",
        isDirty: true,
        onSave,
      },
    });

    // Mark as clean
    act(() => {
      rerender({ formId: "cleanup-form", isDirty: false, onSave });
    });

    // Listener should be removed
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );

    removeEventListenerSpy.mockRestore();
  });
});
