import type { AudioFeatures } from "../domain/audioFeatures";
import { AudioFeatureSampler } from "./features";
import { drawWaveform } from "./modes/waveform";

/** Draws one analyser-driven waveform while playback is active and visible. */
export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D | null;
  private readonly resizeObserver: ResizeObserver | null;
  private sampler: AudioFeatureSampler | null = null;
  private onFeatures: ((features: AudioFeatures) => void) | null = null;
  private frameRequest: number | null = null;
  private running = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.context = canvas.getContext("2d");
    this.resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => this.resize());
    this.resizeObserver?.observe(canvas);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.resize();
  }

  start(
    analyser: AnalyserNode,
    onFeatures?: (features: AudioFeatures) => void,
  ): void {
    if (this.context === null) return;
    this.sampler = new AudioFeatureSampler(analyser);
    this.onFeatures = onFeatures ?? null;
    this.running = true;
    this.requestFrame();
  }

  stop(): void {
    this.running = false;
    if (this.frameRequest !== null) cancelAnimationFrame(this.frameRequest);
    this.frameRequest = null;
    this.sampler = null;
    this.onFeatures = null;
    this.clear();
  }

  dispose(): void {
    this.stop();
    this.resizeObserver?.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      if (this.frameRequest !== null) cancelAnimationFrame(this.frameRequest);
      this.frameRequest = null;
    } else if (this.running) {
      this.requestFrame();
    }
  };

  private requestFrame(): void {
    if (
      this.running &&
      !document.hidden &&
      this.frameRequest === null &&
      this.context !== null &&
      this.sampler !== null
    ) {
      this.frameRequest = requestAnimationFrame(this.renderFrame);
    }
  }

  private readonly renderFrame = (timestamp: number): void => {
    this.frameRequest = null;
    if (!this.running || this.context === null || this.sampler === null) return;
    const features = this.sampler.capture(timestamp);
    drawWaveform(
      this.context,
      features,
      this.canvas.width,
      this.canvas.height,
    );
    this.onFeatures?.(features);
    this.requestFrame();
  };

  private resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(bounds.width * scale));
    const height = Math.max(1, Math.round(bounds.height * scale));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  private clear(): void {
    if (this.context === null) return;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
