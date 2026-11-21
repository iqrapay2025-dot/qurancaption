import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { throttle } from "./throttle";

describe("Performance throttle utility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls immediately on the first invocation", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled("call-1");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("call-1");
  });

  it("suppresses rapid calls within the window and fires the trailing call", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled("first");
    expect(fn).toHaveBeenCalledTimes(1);

    throttled("second");
    throttled("third");
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("third");
  });

  it("allows cancellation of pending trailing call", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled("one");
    throttled("two");
    expect(fn).toHaveBeenCalledTimes(1);

    throttled.cancel();
    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
