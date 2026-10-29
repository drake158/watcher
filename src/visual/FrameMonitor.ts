export interface FrameWindowRecord {
  readonly startedAt: number;
  readonly completedAt: number;
  readonly completedFrames: number;
  readonly fallbackActive: boolean;
}

export interface FrameMonitorOptions {
  readonly onFallback?: () => void;
  readonly onWindow?: (record: FrameWindowRecord) => void;
}

/** Counts completed canvas draws in foreground one-second windows. */
export class FrameMonitor {
  private windowStartedAt: number | null = null;
  private frameCount = 0;
  private consecutiveLowWindows = 0;
  private visible = true;
  private fallbackActive = false;
  private readonly records: FrameWindowRecord[] = [];

  constructor(private readonly options: FrameMonitorOptions = {}) {}

  recordCompletedFrame(timestamp: number): void {
    if (!this.visible || !Number.isFinite(timestamp)) return;
    if (this.windowStartedAt === null) {
      this.windowStartedAt = timestamp;
      this.frameCount = 1;
      return;
    }

    let windowStartedAt = this.windowStartedAt;
    while (timestamp - windowStartedAt >= 1_000) {
      const endedAt: number = windowStartedAt + 1_000;
      this.finishWindow(endedAt);
      windowStartedAt = endedAt;
      this.windowStartedAt = windowStartedAt;
    }
    this.frameCount += 1;
  }

  setVisible(visible: boolean): void {
    if (this.visible === visible) return;
    this.visible = visible;
    // Hidden time must not count as dropped foreground frames.
    this.windowStartedAt = null;
    this.frameCount = 0;
    this.consecutiveLowWindows = 0;
  }

  isFallbackActive(): boolean {
    return this.fallbackActive;
  }

  getWindowRecords(): readonly FrameWindowRecord[] {
    return this.records;
  }

  private finishWindow(completedAt: number): void {
    if (this.windowStartedAt === null) return;
    const low = this.frameCount < 30;
    this.consecutiveLowWindows = low ? this.consecutiveLowWindows + 1 : 0;
    const record: FrameWindowRecord = {
      startedAt: this.windowStartedAt,
      completedAt,
      completedFrames: this.frameCount,
      fallbackActive: this.fallbackActive,
    };
    this.records.push(record);
    if (this.records.length > 120) this.records.shift();
    this.options.onWindow?.(record);
    if (!this.fallbackActive && this.consecutiveLowWindows >= 3) {
      this.fallbackActive = true;
      this.options.onFallback?.();
    }
    this.frameCount = 0;
  }
}
