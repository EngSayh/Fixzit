import { renderHook, act } from "@testing-library/react";
import { useDebounce, useDebounceCallback } from "@/hooks/useDebounce";
import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

describe("useDebounce", () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("should return the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("test", 500));
    expect(result.current).toBe("test");
  });

  it("should only update the value after the delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "initial", delay: 500 },
      },
    );

    expect(result.current).toBe("initial");

    rerender({ value: "updated", delay: 500 });

    // Value should still be the old one
    expect(result.current).toBe("initial");

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now the value should be updated
    expect(result.current).toBe("updated");
  });

  it("should handle rapid changes by only taking the last value", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "a", delay: 500 },
      },
    );

    rerender({ value: "b", delay: 500 });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    rerender({ value: "c", delay: 500 });

    // Value should still be 'a'
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now the value should be 'c'
    expect(result.current).toBe("c");
  });
});

describe("useDebounceCallback", () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("should not call the callback immediately", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounceCallback(callback, 500));

    act(() => {
      result.current("test");
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("should call the callback after the delay", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounceCallback(callback, 500));

    act(() => {
      result.current("test");
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("test");
  });

  it("should only call the latest callback with the latest args", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounceCallback(callback, 500));

    act(() => {
      result.current("a");
      result.current("b");
      result.current("c");
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("c");
  });

  it("should update the callback function without resetting the timer", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const { result, rerender } = renderHook(
      ({ cb }) => useDebounceCallback(cb, 500),
      {
        initialProps: { cb: callback1 },
      },
    );

    act(() => {
      result.current("test");
    });

    // Rerender with a new callback before timer expires
    rerender({ cb: callback2 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledWith("test");
  });
});
