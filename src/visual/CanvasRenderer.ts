import type { AudioFeatures } from "../domain/audioFeatures";
import { DEFAULT_VISUAL_SETTINGS, type VisualSettings } from "../domain/settings";
import type { VisualMode } from "../domain/models";
import { FrameMonitor } from "./FrameMonitor";
import { AudioFeatureSampler } from "./features";
import { getVisualSettingEffects } from "./settingEffects";
import { drawSpectrum } from "./modes/spectrum";
import { drawRadial } from "./modes/radial";
import { drawParticles, type VisualParticle } from "./modes/particle";
import { drawPsychedelic } from "./modes/psychedelic";
import { drawWaveform } from "./modes/waveform";
import type { VisualRenderOptions } from "./renderOptions";

interface MutableAudioFeatures {
  frequency: Uint8Array;
  timeDomain: Float32Array;
  sampleRateHz: number;
  fftSize: number;
  capturedAt: number;
}

export interface CompletedRenderObservation {
  readonly sequence: number;
  readonly drawCompletedAt: number;
  readonly mode: VisualMode;
  readonly features: AudioFeatures;
  readonly settings: VisualSettings;
}

/** Draws one analyser-driven waveform while playback is active and visible. */
export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D | null;
  private readonly resizeObserver: ResizeObserver | null;
  private readonly motionPreference: MediaQueryList | null;
  private sampler: AudioFeatureSampler | null = null;
  private onFeatures: ((features: AudioFeatures) => void) | null = null;
  private mode: VisualMode = "waveform";
  private settings: VisualSettings = { ...DEFAULT_VISUAL_SETTINGS };
  private renderFeatures: MutableAudioFeatures | null = null;
  private particles: VisualParticle[] = [];
  private readonly monitor: FrameMonitor;
  private sequence = 0;
  private diagnosticObserver: ((observation: CompletedRenderObservation) => void) | null = null;
  private beforeRenderHook: (() => void) | null = null;
  private frameRequest: number | null = null;
  private running = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onFallback?: () => void,
  ) {
    this.context = canvas.getContext("2d");
    this.motionPreference = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    this.monitor = new FrameMonitor({
      onFallback: () => {
        this.resize();
        this.onFallback?.();
      },
    });
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

  setMode(mode: VisualMode): void {
    this.mode = mode;
  }

  setVisualSettings(settings: VisualSettings): void {
    this.settings = settings;
  }

  getFrameWindowRecords() {
    return this.monitor.getWindowRecords();
  }

  setDiagnosticObserver(
    observer: ((observation: CompletedRenderObservation) => void) | null,
  ): void {
    this.diagnosticObserver = observer;
  }

  setBeforeRenderHook(hook: (() => void) | null): void {
    this.beforeRenderHook = hook;
  }

  stop(): void {
    this.running = false;
    if (this.frameRequest !== null) cancelAnimationFrame(this.frameRequest);
    this.frameRequest = null;
    this.sampler = null;
    this.onFeatures = null;
    this.renderFeatures = null;
    this.particles.length = 0;
    this.clear();
  }

  dispose(): void {
    this.stop();
    this.resizeObserver?.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }

  private readonly onVisibilityChange = (): void => {
    this.monitor.setVisible(!document.hidden);
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
    this.beforeRenderHook?.();
    const features = this.prepareRenderFeatures(this.sampler.capture(timestamp));
    const options: VisualRenderOptions = {
      colorIntensity: this.settings.colorIntensity,
      motion: this.motionPreference?.matches ? 0 : this.settings.motion,
      effectIntensity: this.settings.effectIntensity,
      selectedPresetId: this.settings.selectedPresetId,
    };
    switch (this.mode) {
      case "waveform":
        drawWaveform(this.context, features, this.canvas.width, this.canvas.height, this.applyFallback(options));
        break;
      case "spectrum":
        drawSpectrum(this.context, features, this.canvas.width, this.canvas.height, this.applyFallback(options));
        break;
      case "radial":
        drawRadial(this.context, features, this.canvas.width, this.canvas.height, this.applyFallback(options));
        break;
      case "particle":
        drawParticles(this.context, features, this.canvas.width, this.canvas.height, this.particles, this.applyFallback(options));
        break;
      case "psychedelic":
        drawPsychedelic(this.context, features, this.canvas.width, this.canvas.height, this.applyFallback(options));
        break;
    }
    // Timestamp only after the renderer has finished all Canvas draw calls.
    const drawCompletedAt = performance.now();
    this.monitor.recordCompletedFrame(drawCompletedAt);
    this.sequence += 1;
    this.diagnosticObserver?.({
      sequence: this.sequence,
      drawCompletedAt,
      mode: this.mode,
      features,
      settings: this.settings,
    });
    this.onFeatures?.(features);
    this.requestFrame();
  };

  private applyFallback(options: VisualRenderOptions): VisualRenderOptions {
    if (!this.monitor.isFallbackActive()) return options;
    return {
      ...options,
      motion: Math.min(options.motion, 18),
      effectIntensity: Math.min(options.effectIntensity, 24),
    };
  }

  private prepareRenderFeatures(source: AudioFeatures): AudioFeatures {
    if (
      this.renderFeatures === null ||
      this.renderFeatures.frequency.length !== source.frequency.length ||
      this.renderFeatures.timeDomain.length !== source.timeDomain.length
    ) {
      this.renderFeatures = {
        frequency: new Uint8Array(source.frequency.length),
        timeDomain: new Float32Array(source.timeDomain.length),
        sampleRateHz: source.sampleRateHz,
        fftSize: source.fftSize,
        capturedAt: source.capturedAt,
      };
    }
    const target = this.renderFeatures;
    const effects = getVisualSettingEffects(this.settings);
    const binWidth = source.sampleRateHz / source.fftSize;
    for (let index = 0; index < source.frequency.length; index += 1) {
      const hz = index * binWidth;
      const band = hz < 250 ? "bass" : hz < 2_000 ? "mid" : "treble";
      const adjusted = source.frequency[index]! * effects.frequencyWeights[band] * effects.sensitivityGain;
      target.frequency[index] = Math.min(255, Math.max(0, Math.round(adjusted)));
    }
    for (let index = 0; index < source.timeDomain.length; index += 1) {
      target.timeDomain[index] = Math.min(
        1,
        Math.max(-1, source.timeDomain[index]! * effects.sensitivityGain),
      );
    }
    // Update scalar metadata on this reusable object without replacing buffers.
    target.sampleRateHz = source.sampleRateHz;
    target.fftSize = source.fftSize;
    target.capturedAt = source.capturedAt;
    return target;
  }

  private resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    const scale = Math.min(this.monitor.isFallbackActive() ? 1 : 2, window.devicePixelRatio || 1);
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
