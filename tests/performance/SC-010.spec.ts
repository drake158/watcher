import { afterEach, describe, expect, it, vi } from "vitest";

interface StressHarnessModule {
  ARTIFICIAL_RENDER_LOAD_MS: number;
  FrameStressHarness: new (options: {
    onFallback: () => void;
    startArtificialLoad: () => void;
    stopArtificialLoad: () => void;
  }) => {
    recordCompletedFrame(timestampMs: number): void;
    beforeRender(): void;
    start(): void;
    abort(): void;
    getEvidence(): { injectedFrames: number; stopReason: string | null };
  };
}

const loadHarness = async (): Promise<StressHarnessModule> =>
  (await import("../../tests/support/FrameStressHarness")) as StressHarnessModule;

function feedThreeLowFrameWindows(harness: InstanceType<StressHarnessModule["FrameStressHarness"]>): void {
  for (let frame = 0; frame <= 87; frame += 1) {
    harness.recordCompletedFrame((frame * 1_000) / 29);
  }
}

describe("SC-010 controlled low-frame stress contract", () => {
  afterEach(() => vi.useRealTimers());

  it("uses the documented 45 ms artificial render load", async () => {
    const { ARTIFICIAL_RENDER_LOAD_MS, FrameStressHarness } = await loadHarness();
    expect(ARTIFICIAL_RENDER_LOAD_MS).toBe(45);
    const harness = new FrameStressHarness({
      onFallback: vi.fn(),
      startArtificialLoad: vi.fn(),
      stopArtificialLoad: vi.fn(),
    });
    harness.start();
    const startedAt = performance.now();
    harness.beforeRender();
    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(45);
    expect(harness.getEvidence().injectedFrames).toBe(1);
    harness.abort();
  });

  it("activates fallback after three consecutive sub-30 one-second windows", async () => {
    vi.useFakeTimers();
    const { FrameStressHarness } = await loadHarness();
    const onFallback = vi.fn();
    const harness = new FrameStressHarness({
      onFallback,
      startArtificialLoad: vi.fn(),
      stopArtificialLoad: vi.fn(),
    });
    harness.start();
    feedThreeLowFrameWindows(harness);
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it("starts 45 ms artificial load only for verification and stops it at the 4-second trigger deadline", async () => {
    vi.useFakeTimers();
    const { FrameStressHarness } = await loadHarness();
    const startArtificialLoad = vi.fn();
    const stopArtificialLoad = vi.fn();
    const harness = new FrameStressHarness({
      onFallback: vi.fn(),
      startArtificialLoad,
      stopArtificialLoad,
    });
    harness.start();
    expect(startArtificialLoad).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(stopArtificialLoad).toHaveBeenCalledTimes(1);
    expect(harness.getEvidence().stopReason).toBe("trigger-timeout");
  });

  it("keeps load for ten seconds after fallback, then removes it; abort also removes it", async () => {
    vi.useFakeTimers();
    const { FrameStressHarness } = await loadHarness();
    const startArtificialLoad = vi.fn();
    const stopArtificialLoad = vi.fn();
    const harness = new FrameStressHarness({
      onFallback: vi.fn(),
      startArtificialLoad,
      stopArtificialLoad,
    });
    harness.start();
    feedThreeLowFrameWindows(harness);
    expect(stopArtificialLoad).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(9_999);
    expect(stopArtificialLoad).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(stopArtificialLoad).toHaveBeenCalledTimes(1);
    expect(harness.getEvidence().stopReason).toBe("control-window-complete");

    const abortedStop = vi.fn();
    const aborted = new FrameStressHarness({
      onFallback: vi.fn(),
      startArtificialLoad: vi.fn(),
      stopArtificialLoad: abortedStop,
    });
    aborted.start();
    aborted.abort();
    expect(abortedStop).toHaveBeenCalledTimes(1);
    expect(aborted.getEvidence().stopReason).toBe("aborted");
  });
});
