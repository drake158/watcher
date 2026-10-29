import { FrameMonitor } from "../../src/visual/FrameMonitor";
import type { CanvasRenderer } from "../../src/visual/CanvasRenderer";

export const ARTIFICIAL_RENDER_LOAD_MS = 45;
export const FALLBACK_TRIGGER_DEADLINE_MS = 4_000;
export const POST_TRIGGER_CONTROL_WINDOW_MS = 10_000;

export interface FrameStressHarnessOptions {
  readonly onFallback: () => void;
  readonly startArtificialLoad: () => void;
  readonly stopArtificialLoad: () => void;
}

export interface FrameStressEvidence {
  readonly startedAt: number | null;
  readonly stoppedAt: number | null;
  readonly fallbackActivatedAt: number | null;
  readonly stopReason: "trigger-timeout" | "control-window-complete" | "aborted" | null;
  readonly injectedFrames: number;
  readonly injectedLoadMs: number;
}

/** Test-only deterministic stress controller; never imported by production source. */
export class FrameStressHarness {
  private started = false;
  private stopped = false;
  private triggered = false;
  private deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  private controlTimer: ReturnType<typeof setTimeout> | null = null;
  private startedAt: number | null = null;
  private stoppedAt: number | null = null;
  private fallbackActivatedAt: number | null = null;
  private stopReason: FrameStressEvidence["stopReason"] = null;
  private injectedFrames = 0;
  private injectedLoadMs = 0;
  private boundRenderer: CanvasRenderer | null = null;
  private readonly monitor: FrameMonitor;

  constructor(private readonly options: FrameStressHarnessOptions) {
    this.monitor = new FrameMonitor({
      onFallback: () => this.onFallbackTriggered(),
    });
  }

  start(): void {
    if (this.started || this.stopped) return;
    this.started = true;
    this.startedAt = performance.now();
    this.options.startArtificialLoad();
    this.deadlineTimer = setTimeout(() => {
      if (!this.triggered) this.stop("trigger-timeout");
    }, FALLBACK_TRIGGER_DEADLINE_MS);
  }

  bind(renderer: CanvasRenderer): void {
    this.boundRenderer = renderer;
    renderer.setBeforeRenderHook(() => this.beforeRender());
    renderer.setDiagnosticObserver(({ drawCompletedAt }) => {
      this.recordCompletedFrame(drawCompletedAt);
    });
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.onVisibilityChange);
    }
  }

  /** Call immediately before a test render to inject the specified UI-thread load. */
  beforeRender(): void {
    if (!this.started || this.stopped) return;
    const endAt = performance.now() + ARTIFICIAL_RENDER_LOAD_MS;
    while (performance.now() < endAt) {
      // Intentional synchronous test-only workload approximates render-thread pressure.
    }
    this.injectedFrames += 1;
    this.injectedLoadMs += ARTIFICIAL_RENDER_LOAD_MS;
  }

  recordCompletedFrame(timestampMs: number): void {
    if (!this.started || this.stopped) return;
    this.monitor.recordCompletedFrame(timestampMs);
  }

  abort(): void {
    this.stop("aborted");
  }

  isStopped(): boolean {
    return this.stopped;
  }

  getEvidence(): FrameStressEvidence {
    return {
      startedAt: this.startedAt,
      stoppedAt: this.stoppedAt,
      fallbackActivatedAt: this.fallbackActivatedAt,
      stopReason: this.stopReason,
      injectedFrames: this.injectedFrames,
      injectedLoadMs: this.injectedLoadMs,
    };
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) this.abort();
  };

  private onFallbackTriggered(): void {
    if (!this.started || this.stopped || this.triggered) return;
    this.triggered = true;
    this.fallbackActivatedAt = performance.now();
    if (this.deadlineTimer !== null) clearTimeout(this.deadlineTimer);
    this.deadlineTimer = null;
    this.options.onFallback();
    this.controlTimer = setTimeout(() => this.stop("control-window-complete"), POST_TRIGGER_CONTROL_WINDOW_MS);
  }

  private stop(reason: FrameStressEvidence["stopReason"]): void {
    if (this.stopped) return;
    this.stopped = true;
    this.stoppedAt = performance.now();
    this.stopReason = reason;
    if (this.deadlineTimer !== null) clearTimeout(this.deadlineTimer);
    if (this.controlTimer !== null) clearTimeout(this.controlTimer);
    this.deadlineTimer = null;
    this.controlTimer = null;
    if (this.boundRenderer !== null) {
      this.boundRenderer.setBeforeRenderHook(null);
      this.boundRenderer.setDiagnosticObserver(null);
      this.boundRenderer = null;
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
    }
    this.options.stopArtificialLoad();
  }
}
